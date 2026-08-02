package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateProfileForCompany;
import com.openopportunity.auth.dto.CandidateSearchSummary;
import com.openopportunity.auth.dto.ContactQuotaSummary;
import com.openopportunity.auth.dto.RevealCandidateContactResponse;
import com.openopportunity.auth.exception.CandidateProfileNotFoundException;
import com.openopportunity.auth.exception.CandidateResumeNotFoundException;
import com.openopportunity.auth.exception.CompanyNotEligibleToContactCandidatesException;
import com.openopportunity.auth.exception.ResumeRenderingFailedException;
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Small local dataset — filters in memory rather than building SQL Specifications like the
 * Job Service's search does, same approach AdminUserService takes for its own cross-entity
 * (User + CompanyProfile) search. There's no "visible to companies" opt-out anywhere yet — every
 * registered candidate is searchable, matching what the mock UI this replaces assumed. */
@Service
public class CandidateSearchService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CandidateContactRevealRepository candidateContactRevealRepository;
    private final CandidateSubscriptionRepository candidateSubscriptionRepository;
    private final FileStorageService fileStorageService;
    private final CompanyBillingService companyBillingService;

    public CandidateSearchService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            CompanyProfileRepository companyProfileRepository,
            CandidateContactRevealRepository candidateContactRevealRepository,
            CandidateSubscriptionRepository candidateSubscriptionRepository,
            FileStorageService fileStorageService,
            CompanyBillingService companyBillingService) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.candidateContactRevealRepository = candidateContactRevealRepository;
        this.candidateSubscriptionRepository = candidateSubscriptionRepository;
        this.fileStorageService = fileStorageService;
        this.companyBillingService = companyBillingService;
    }

    @Transactional(readOnly = true)
    public List<CandidateSearchSummary> search(UUID companyId, String q, List<String> locations, String sort) {
        String normalizedQuery = q == null ? null : q.trim().toLowerCase();
        List<String> normalizedLocations = normalizeLocations(locations);

        List<CandidateProfile> profiles = candidateProfileRepository.findAll();
        Map<UUID, User> usersById = userRepository
                .findAllById(profiles.stream().map(CandidateProfile::getUserId).toList())
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Set<UUID> revealedCandidateIds = candidateContactRevealRepository.findByCompanyId(companyId).stream()
                .map(CandidateContactReveal::getCandidateId)
                .collect(Collectors.toCollection(HashSet::new));
        // Only currently-active paid subscriptions count — a lapsed plan the daily
        // expireOverdueSubscriptions sweep hasn't gotten to yet shouldn't still get boosted.
        // Candidates only ever hold FREE or PLUS in practice (CandidateBillingService blocks
        // PRO for candidate self-serve), so "not FREE" is equivalent to "is Plus" here.
        Set<UUID> plusCandidateIds = candidateSubscriptionRepository
                .findByPlanNotAndCurrentPeriodEndAfter(SubscriptionPlan.FREE, Instant.now())
                .stream()
                .map(CandidateSubscription::getCandidateId)
                .collect(Collectors.toCollection(HashSet::new));

        return profiles.stream()
                .filter(profile -> usersById.containsKey(profile.getUserId()))
                .filter(profile -> matchesQuery(profile, usersById.get(profile.getUserId()), normalizedQuery))
                .filter(profile -> matchesAnyLocation(profile, normalizedLocations))
                .sorted(resolveSort(sort, usersById, revealedCandidateIds, plusCandidateIds))
                .map(profile -> toSummary(
                        profile,
                        usersById.get(profile.getUserId()),
                        revealedCandidateIds.contains(profile.getUserId()),
                        plusCandidateIds.contains(profile.getUserId())))
                .toList();
    }

    /** Ranking is layered, highest priority first: an admin-featured candidate (see
     * AdminUserService#feature) always leads, then a Plus-plan candidate, and only within those
     * tiers does the company's chosen sort apply — "name" alphabetically; "contacted" puts
     * candidates whose contact this company has already revealed (see revealContact) first;
     * "newest" and the default ("relevant" — no ranking model exists yet) both fall back to
     * recency, same reasoning as JobService.resolveSort. */
    private Comparator<CandidateProfile> resolveSort(
            String sort, Map<UUID, User> usersById, Set<UUID> revealedCandidateIds, Set<UUID> plusCandidateIds) {
        return Comparator.comparing((CandidateProfile profile) -> profile.getFeaturedAt() != null ? 0 : 1)
                .thenComparing(profile -> plusCandidateIds.contains(profile.getUserId()) ? 0 : 1)
                .thenComparing(baseSort(sort, usersById, revealedCandidateIds));
    }

    private Comparator<CandidateProfile> baseSort(
            String sort, Map<UUID, User> usersById, Set<UUID> revealedCandidateIds) {
        if ("name".equals(sort)) {
            return Comparator.comparing(
                    profile -> usersById.get(profile.getUserId()).getFullName().toLowerCase());
        }
        if ("contacted".equals(sort)) {
            return Comparator.comparing(
                    (CandidateProfile profile) -> revealedCandidateIds.contains(profile.getUserId()) ? 0 : 1);
        }
        return Comparator.comparing(
                        (CandidateProfile profile) -> usersById.get(profile.getUserId()).getCreatedAt())
                .reversed();
    }

    /** Backs the "View profile" page — now gated the same as revealContact/getResume (complete +
     * verified company profile, on a paid plan, with contact-reveal quota remaining for this
     * billing period). Viewing a candidate's full profile is treated as sensitive as their
     * resume/contact details, not freely browsable like the search results list. */
    @Transactional(readOnly = true)
    public CandidateProfileForCompany get(UUID companyId, UUID candidateUserId) {
        requireEligibleToContactCandidates(companyId);
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(candidateUserId)
                .orElseThrow(() -> new CandidateProfileNotFoundException(candidateUserId));
        User user = userRepository
                .findById(candidateUserId)
                .orElseThrow(() -> new CandidateProfileNotFoundException(candidateUserId));
        return new CandidateProfileForCompany(
                user.getId(),
                user.getFullName(),
                profile.getPhotoStorageKey() == null ? null : photoUrl(candidateUserId),
                profile.getTitle(),
                profile.getLocation(),
                profile.getExperienceLevel(),
                profile.getIndustry(),
                profile.getSkills(),
                profile.getWorkModePreference(),
                profile.getOpenToPreference(),
                user.getCreatedAt(),
                profile.getResumeFileName(),
                profile.getResumeUploadedAt(),
                profile.getResumeSizeBytes());
    }

    /** Same eligibility gate as revealContact — a resume is at least as sensitive as a phone
     * number, so it gets the same "complete + verified company profile, paid plan with quota
     * remaining" requirement. */
    @Transactional(readOnly = true)
    public LoadedResume getResume(UUID companyId, UUID candidateUserId) {
        requireEligibleToContactCandidates(companyId);
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(candidateUserId)
                .filter(existing -> existing.getResumeStorageKey() != null)
                .orElseThrow(() -> new CandidateResumeNotFoundException(candidateUserId));
        try {
            Resource resource = fileStorageService.load(profile.getResumeStorageKey());
            return new LoadedResume(resource, profile.getResumeFileName(), contentTypeFor(profile.getResumeFileName()));
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load resume", ex);
        }
    }

    public record LoadedResume(Resource resource, String fileName, String contentType) {}

    /** Renders the resume as an HTML fragment (see ResumeHtmlRenderer) for the "view resume as a
     * web view" preview — same eligibility gate and file lookup as getResume above, but returns
     * markup instead of raw bytes so .docx/.doc resumes (which a browser can't render inline in
     * an &lt;iframe&gt; the way it can a PDF) get a real preview too. */
    @Transactional(readOnly = true)
    public String getResumeHtml(UUID companyId, UUID candidateUserId) {
        requireEligibleToContactCandidates(companyId);
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(candidateUserId)
                .filter(existing -> existing.getResumeStorageKey() != null)
                .orElseThrow(() -> new CandidateResumeNotFoundException(candidateUserId));
        try (InputStream in = fileStorageService.load(profile.getResumeStorageKey()).getInputStream()) {
            return ResumeHtmlRenderer.render(in, profile.getResumeFileName());
        } catch (IOException | RuntimeException ex) {
            throw new ResumeRenderingFailedException(candidateUserId, ex);
        }
    }

    /** Backs the "N of M contacts remaining" indicator the frontend uses to enable/disable
     * "View contact" and "View profile" before the company even clicks (rather than only finding
     * out via a 403 from requireEligibleToContactCandidates). */
    @Transactional(readOnly = true)
    public ContactQuotaSummary getContactQuota(UUID companyId) {
        CompanyBillingService.PlanPeriod planPeriod = companyBillingService.getPlanPeriod(companyId);
        int limit = planPeriod.plan().getContactQuota();
        long used = planPeriod.currentPeriodStart() == null
                ? 0
                : candidateContactRevealRepository.countByCompanyIdAndRevealedAtAfter(
                        companyId, planPeriod.currentPeriodStart());
        long remaining = Math.max(0, limit - used);
        return new ContactQuotaSummary(planPeriod.plan(), limit, used, remaining, planPeriod.currentPeriodEnd());
    }

    private String contentTypeFor(String fileName) {
        String lower = fileName == null ? "" : fileName.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        if (lower.endsWith(".doc")) {
            return "application/msword";
        }
        return "application/octet-stream";
    }

    /** Idempotent — a company clicking "View contact" again on an already-revealed candidate
     * just gets the same number back, no duplicate row (the unique (company_id, candidate_id)
     * constraint backs this even if two requests somehow race) and no quota check, since nothing
     * new is being unlocked. A genuinely new reveal does require eligibility (paid plan, quota
     * remaining this billing period). */
    @Transactional
    public RevealCandidateContactResponse revealContact(UUID companyId, UUID candidateUserId) {
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(candidateUserId)
                .orElseThrow(() -> new CandidateProfileNotFoundException(candidateUserId));
        if (!candidateContactRevealRepository.existsByCompanyIdAndCandidateId(companyId, candidateUserId)) {
            requireEligibleToContactCandidates(companyId);
            candidateContactRevealRepository.save(new CandidateContactReveal(companyId, candidateUserId));
        }
        return new RevealCandidateContactResponse(profile.getMobile());
    }

    private void requireEligibleToContactCandidates(UUID companyId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(companyId).orElseThrow();
        if (!profile.isProfileComplete()) {
            throw new CompanyNotEligibleToContactCandidatesException(
                    "Complete your company profile before contacting candidates");
        }
        if (!profile.isVerified()) {
            throw new CompanyNotEligibleToContactCandidatesException(
                    "Your company profile is awaiting admin verification before you can contact candidates");
        }
        ContactQuotaSummary quota = getContactQuota(companyId);
        if (quota.plan() == CompanySubscriptionPlan.FREE) {
            throw new CompanyNotEligibleToContactCandidatesException(
                    "Upgrade to a paid plan to view candidate profiles and contacts");
        }
        if (quota.remaining() <= 0) {
            throw new CompanyNotEligibleToContactCandidatesException(
                    "You've used all " + quota.limit() + " candidate contacts for this billing period");
        }
    }

    private boolean matchesQuery(CandidateProfile profile, User user, String normalizedQuery) {
        if (normalizedQuery == null || normalizedQuery.isBlank()) {
            return true;
        }
        if (user.getFullName().toLowerCase().contains(normalizedQuery)) {
            return true;
        }
        if (profile.getTitle() != null && profile.getTitle().toLowerCase().contains(normalizedQuery)) {
            return true;
        }
        return profile.getSkills().stream().anyMatch(skill -> skill.toLowerCase().contains(normalizedQuery));
    }

    /** Matches if ANY of the given locations is a substring of the candidate's location — same
     * multi-value relaxation as JobSpecifications.matchesAnyLocation, for the location filter's
     * city tags. */
    private boolean matchesAnyLocation(CandidateProfile profile, List<String> normalizedLocations) {
        if (normalizedLocations.isEmpty()) {
            return true;
        }
        if (profile.getLocation() == null) {
            return false;
        }
        String lowerLocation = profile.getLocation().toLowerCase();
        return normalizedLocations.stream().anyMatch(lowerLocation::contains);
    }

    private List<String> normalizeLocations(List<String> locations) {
        if (locations == null || locations.isEmpty()) {
            return List.of();
        }
        return locations.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase())
                .toList();
    }

    private String photoUrl(UUID userId) {
        return "/api/candidates/" + userId + "/photo";
    }

    private CandidateSearchSummary toSummary(
            CandidateProfile profile, User user, boolean contactRevealed, boolean isPlus) {
        return new CandidateSearchSummary(
                user.getId(),
                user.getFullName(),
                profile.getTitle(),
                profile.getLocation(),
                profile.getSkills(),
                contactRevealed ? profile.getMobile() : null,
                isPlus,
                profile.getFeaturedAt() != null);
    }
}
