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
import com.openopportunity.mockinterview.MockInterviewService;
import com.openopportunity.storage.FileStorageService;
import java.io.ByteArrayInputStream;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** search() filters at the DB via CandidateProfileSpecifications (same idiom as JobService's
 * own search) rather than fetching every CandidateProfile row and filtering in Java — the
 * ranking pass that follows (featured/Plus-plan boost, then name/contacted/newest) still runs
 * in Java, same as JobService.rankSearchResults does, since it needs revealed-contact state that
 * only makes sense per calling company. There's no "visible to companies" opt-out anywhere yet —
 * every registered candidate is searchable, matching what the mock UI this replaces assumed. */
@Service
public class CandidateSearchService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CandidateContactRevealRepository candidateContactRevealRepository;
    private final CandidateSubscriptionRepository candidateSubscriptionRepository;
    private final FileStorageService fileStorageService;
    private final CompanyBillingService companyBillingService;
    private final MockInterviewService mockInterviewService;
    private final Executor resumeRenderExecutor;
    private final long resumeRenderTimeoutSeconds;

    public CandidateSearchService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            CompanyProfileRepository companyProfileRepository,
            CandidateContactRevealRepository candidateContactRevealRepository,
            CandidateSubscriptionRepository candidateSubscriptionRepository,
            FileStorageService fileStorageService,
            CompanyBillingService companyBillingService,
            MockInterviewService mockInterviewService,
            @Qualifier("resumeRenderExecutor") Executor resumeRenderExecutor,
            @Value("${app.resume-render.timeout-seconds}") long resumeRenderTimeoutSeconds) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.candidateContactRevealRepository = candidateContactRevealRepository;
        this.candidateSubscriptionRepository = candidateSubscriptionRepository;
        this.fileStorageService = fileStorageService;
        this.companyBillingService = companyBillingService;
        this.mockInterviewService = mockInterviewService;
        this.resumeRenderExecutor = resumeRenderExecutor;
        this.resumeRenderTimeoutSeconds = resumeRenderTimeoutSeconds;
    }

    @Transactional(readOnly = true)
    public List<CandidateSearchSummary> search(UUID companyId, String q, List<String> locations, String sort) {
        Specification<CandidateProfile> spec = Specification.allOf(
                CandidateProfileSpecifications.matchesQuery(q),
                CandidateProfileSpecifications.matchesAnyLocation(locations));

        List<CandidateProfile> profiles = candidateProfileRepository.findAll(spec);
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
     * "recentLogin" puts candidates who've signed in most recently first, with anyone who's
     * never logged in (User#lastLoginAt null — e.g. seeded/admin-created accounts) sorted last;
     * "mostActive" puts candidates with the highest total login count first (ties broken by
     * most recent login) — a coarse activity signal distinct from recency, since a candidate who
     * logs in constantly should outrank one who logged in once, recently; "newest" and the
     * default ("relevant" — no ranking model exists yet) both fall back to recency, same
     * reasoning as JobService.resolveSort. */
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
        if ("recentLogin".equals(sort)) {
            return Comparator.comparing(
                    (CandidateProfile profile) -> usersById.get(profile.getUserId()).getLastLoginAt(),
                    Comparator.nullsLast(Comparator.reverseOrder()));
        }
        if ("mostActive".equals(sort)) {
            return Comparator.comparing(
                            (CandidateProfile profile) -> usersById.get(profile.getUserId()).getLoginCount())
                    .reversed()
                    .thenComparing(
                            (CandidateProfile profile) ->
                                    usersById.get(profile.getUserId()).getLastLoginAt(),
                            Comparator.nullsLast(Comparator.reverseOrder()));
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
                profile.getYearsOfExperience(),
                profile.getCurrentSalaryLakhs(),
                profile.getNoticePeriod(),
                profile.getEducationDegree(),
                profile.getEducationInstitution(),
                profile.getEducationGraduationYear(),
                user.getCreatedAt(),
                profile.getResumeFileName(),
                profile.getResumeUploadedAt(),
                profile.getResumeSizeBytes(),
                mockInterviewService.getVisibleForCompany(candidateUserId));
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

    /** Same eligibility gate as getResume — a candidate's mock interview recording is at least
     * as sensitive, and is only reachable at all once the candidate has separately opted the
     * specific session in (see MockInterviewService#getVideoForCompany). */
    @Transactional(readOnly = true)
    public MockInterviewService.LoadedFile getMockInterviewVideo(
            UUID companyId, UUID candidateUserId, UUID sessionId) {
        requireEligibleToContactCandidates(companyId);
        return mockInterviewService.getVideoForCompany(sessionId, candidateUserId);
    }

    @Transactional(readOnly = true)
    public MockInterviewService.LoadedFile getMockInterviewThumbnail(
            UUID companyId, UUID candidateUserId, UUID sessionId) {
        requireEligibleToContactCandidates(companyId);
        return mockInterviewService.getThumbnailForCompany(sessionId, candidateUserId);
    }

    /** Renders the resume as an HTML fragment (see ResumeHtmlRenderer) for the "view resume as a
     * web view" preview — same eligibility gate and file lookup as getResume above, but returns
     * markup instead of raw bytes so .docx/.doc resumes (which a browser can't render inline in
     * an &lt;iframe&gt; the way it can a PDF) get a real preview too.
     *
     * <p>The actual PDFBox/POI parse runs on resumeRenderExecutor (see AsyncConfig) with a
     * bounded wait rather than inline on this request thread — a pathological but
     * validly-signed upload (see ResumeContentValidator, which only checks the file is really a
     * PDF/DOC/DOCX, not that it's well-formed enough to parse quickly) could otherwise tie up
     * the calling thread indefinitely. */
    @Transactional(readOnly = true)
    public String getResumeHtml(UUID companyId, UUID candidateUserId) {
        requireEligibleToContactCandidates(companyId);
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(candidateUserId)
                .filter(existing -> existing.getResumeStorageKey() != null)
                .orElseThrow(() -> new CandidateResumeNotFoundException(candidateUserId));
        byte[] content;
        try (InputStream in = fileStorageService.load(profile.getResumeStorageKey()).getInputStream()) {
            content = in.readAllBytes();
        } catch (IOException ex) {
            throw new ResumeRenderingFailedException(candidateUserId, ex);
        }
        String fileName = profile.getResumeFileName();
        try {
            return CompletableFuture.supplyAsync(() -> renderOrThrow(content, fileName), resumeRenderExecutor)
                    .get(resumeRenderTimeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException | RejectedExecutionException ex) {
            throw new ResumeRenderingFailedException(candidateUserId, ex);
        } catch (ExecutionException ex) {
            throw new ResumeRenderingFailedException(
                    candidateUserId, ex.getCause() != null ? ex.getCause() : ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResumeRenderingFailedException(candidateUserId, ex);
        }
    }

    private static String renderOrThrow(byte[] content, String fileName) {
        try (InputStream in = new ByteArrayInputStream(content)) {
            return ResumeHtmlRenderer.render(in, fileName);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
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
