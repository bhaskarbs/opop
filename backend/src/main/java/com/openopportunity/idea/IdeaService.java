package com.openopportunity.idea;

import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.CandidateBillingService;
import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaInterestRequest;
import com.openopportunity.idea.dto.IdeaInterestSummary;
import com.openopportunity.idea.dto.IdeaRequest;
import com.openopportunity.idea.dto.IdeaSummary;
import com.openopportunity.idea.dto.MyIdeaInterestSummary;
import com.openopportunity.idea.exception.DuplicateIdeaInterestException;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaLimitReachedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdeaService {

    // Applies to any submitter (candidate or company) — a single flat cap, not plan-gated.
    private static final long MAX_IDEAS_PER_SUBMITTER = 5;

    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;
    private final IdeaInterestRepository ideaInterestRepository;
    private final NotificationService notificationService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateBillingService candidateBillingService;
    private final CompanyBillingService companyBillingService;
    private final CompanyProfileRepository companyProfileRepository;

    public IdeaService(
            IdeaRepository ideaRepository,
            UserRepository userRepository,
            IdeaInterestRepository ideaInterestRepository,
            NotificationService notificationService,
            CandidateProfileRepository candidateProfileRepository,
            CandidateBillingService candidateBillingService,
            CompanyBillingService companyBillingService,
            CompanyProfileRepository companyProfileRepository) {
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.notificationService = notificationService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.candidateBillingService = candidateBillingService;
        this.companyBillingService = companyBillingService;
        this.companyProfileRepository = companyProfileRepository;
    }

    @Transactional
    public IdeaDetail create(UUID submitterId, IdeaRequest request) {
        if (ideaRepository.countBySubmitterId(submitterId) >= MAX_IDEAS_PER_SUBMITTER) {
            throw new IdeaLimitReachedException();
        }
        User submitter = userRepository.findById(submitterId).orElseThrow();
        Idea idea = new Idea(
                submitterId,
                submitter.getFullName(),
                submitter.getRole(),
                request.title(),
                request.category(),
                request.stage(),
                request.problem(),
                request.solution(),
                request.targetMarket(),
                request.funding(),
                request.equity(),
                request.teamSize(),
                request.timeline(),
                request.videoLink(),
                request.contactEmail());
        // Idea's id is client-side-assigned (no @GeneratedValue), so Spring Data JPA's default
        // isNew() check (id == null?) sees it as "existing" and routes save() through merge()
        // rather than persist() — merge() returns a different managed instance than the one
        // passed in, so @PrePersist-populated fields (createdAt/updatedAt) only show up on
        // that returned instance, not on `idea` itself.
        idea = ideaRepository.save(idea);
        notifyAdminsIdeaPending(idea);
        return toDetail(idea);
    }

    /** Admin-authored idea (AdminIdeasPage) — on behalf of a submitter the admin chooses, rather
     * than the caller themselves (see create() above, where submitterId is always the
     * authenticated caller's own id). Posts straight to APPROVED rather than PENDING — an admin
     * acting directly *is* the approval, mirroring JobService#adminCreate. Still enforces
     * MAX_IDEAS_PER_SUBMITTER, same as any other creation path. */
    @Transactional
    public IdeaDetail adminCreate(UUID submitterId, IdeaRequest request) {
        if (ideaRepository.countBySubmitterId(submitterId) >= MAX_IDEAS_PER_SUBMITTER) {
            throw new IdeaLimitReachedException();
        }
        User submitter = userRepository.findById(submitterId).orElseThrow();
        Idea idea = new Idea(
                submitterId,
                submitter.getFullName(),
                submitter.getRole(),
                request.title(),
                request.category(),
                request.stage(),
                request.problem(),
                request.solution(),
                request.targetMarket(),
                request.funding(),
                request.equity(),
                request.teamSize(),
                request.timeline(),
                request.videoLink(),
                request.contactEmail());
        idea.approve();
        idea = ideaRepository.save(idea);
        return toDetail(idea);
    }

    @Transactional(readOnly = true)
    public List<IdeaSummary> browse(String q, String category, IdeaStage stage) {
        Specification<Idea> spec = Specification.allOf(
                IdeaSpecifications.hasStatus(IdeaStatus.APPROVED),
                IdeaSpecifications.matchesKeyword(q),
                IdeaSpecifications.hasCategory(category),
                IdeaSpecifications.hasStage(stage));
        List<Idea> ideas = ideaRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        return rankByFeatured(ideas).stream().map(this::toSummary).toList();
    }

    /** Layered on top of the createdAt-desc DB order — an admin-featured idea leads, and
     * Stream.sorted's stable-sort guarantee means everything else keeps that original order
     * within the two tiers. Mirrors JobService#rankSearchResults. */
    private List<Idea> rankByFeatured(List<Idea> ideas) {
        return ideas.stream()
                .sorted(Comparator.comparing((Idea idea) -> idea.getFeaturedAt() != null ? 0 : 1))
                .toList();
    }

    /** Anyone can view an APPROVED idea (public community browse/detail); a PENDING/REJECTED
     * idea is only visible to its own submitter, e.g. while editing it — {@code callerId} is
     * null for anonymous requests. Non-owners requesting a non-approved idea get the same 404
     * as a truly unknown id, so existence of unapproved ideas isn't leaked. */
    @Transactional(readOnly = true)
    public IdeaDetail get(UUID id, UUID callerId) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        boolean isOwner = callerId != null && idea.getSubmitterId().equals(callerId);
        if (idea.getStatus() != IdeaStatus.APPROVED && !isOwner) {
            throw new IdeaNotFoundException(id);
        }
        return toDetail(idea);
    }

    /** Admin read of any idea's full detail, regardless of status or submitter — see
     * IdeaService#get above, which blocks a non-owner from seeing a PENDING/REJECTED idea.
     * Backs AdminIdeasPage's edit form, which otherwise couldn't load one it doesn't own. */
    @Transactional(readOnly = true)
    public IdeaDetail adminGet(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        return toDetail(idea);
    }

    /** Full detail (not the summary browse() returns) — the admin review card shows every
     * field, same as an admin reviewing a company profile sees every field. */
    @Transactional(readOnly = true)
    public List<IdeaDetail> getPending(String q) {
        Specification<Idea> spec = Specification.allOf(
                IdeaSpecifications.hasStatus(IdeaStatus.PENDING), IdeaSpecifications.matchesAdminReviewQuery(q));
        return ideaRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toDetail)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IdeaSummary> getMine(UUID submitterId) {
        return ideaRepository.findBySubmitterIdOrderByCreatedAtDesc(submitterId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public void delete(UUID id, UUID submitterId) {
        Idea idea = findOwned(id, submitterId);
        deleteWithInterests(idea);
    }

    /** Admin-initiated hard delete — unlike delete(id, submitterId) above, doesn't require
     * submitter ownership. Also the per-idea half of AdminAccountDeletionService's candidate/
     * company cascade. */
    @Transactional
    public void adminDelete(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        deleteWithInterests(idea);
    }

    // idea_interests has no DB-level FK to ideas, so this cleanup is entirely
    // application-managed — shared by both delete paths above.
    private void deleteWithInterests(Idea idea) {
        ideaInterestRepository.deleteByIdeaId(idea.getId());
        ideaRepository.delete(idea);
    }

    @Transactional
    public IdeaDetail approve(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.approve();
        ideaRepository.save(idea);
        notificationService.notify(
                idea.getSubmitterId(),
                NotificationType.IDEA_APPROVED,
                "Your idea \"" + idea.getTitle() + "\" has been approved and is now live.",
                "/partnerships/ideas/" + idea.getId());
        return toDetail(idea);
    }

    @Transactional
    public IdeaDetail reject(UUID id, String reason) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.reject();
        ideaRepository.save(idea);
        notificationService.notify(
                idea.getSubmitterId(),
                NotificationType.IDEA_REJECTED,
                "Your idea \"" + idea.getTitle() + "\" was not approved. Reason: " + reason,
                "/partnerships/ideas/" + idea.getId());
        return toDetail(idea);
    }

    /** Pins this idea above the rest of the community browse list (see rankByFeatured) —
     * mirrors JobService#feature. */
    @Transactional
    public IdeaDetail feature(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.feature();
        ideaRepository.save(idea);
        return toDetail(idea);
    }

    @Transactional
    public IdeaDetail unfeature(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.unfeature();
        ideaRepository.save(idea);
        return toDetail(idea);
    }

    @Transactional
    public IdeaDetail update(UUID id, UUID submitterId, IdeaRequest request) {
        Idea idea = findOwned(id, submitterId);
        idea.update(
                request.title(),
                request.category(),
                request.stage(),
                request.problem(),
                request.solution(),
                request.targetMarket(),
                request.funding(),
                request.equity(),
                request.teamSize(),
                request.timeline(),
                request.videoLink(),
                request.contactEmail());
        ideaRepository.save(idea);
        notifyAdminsIdeaPending(idea);
        return toDetail(idea);
    }

    /** Admin edit of any idea's content, regardless of which submitter owns it (AdminIdeasPage)
     * — mirrors update() above but skips findOwned's ownership check and, via Idea#adminUpdate,
     * doesn't reset status back to PENDING (the admin doing the edit *is* the review), same
     * reasoning as JobService#adminUpdate. */
    @Transactional
    public IdeaDetail adminUpdate(UUID id, IdeaRequest request) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.adminUpdate(
                request.title(),
                request.category(),
                request.stage(),
                request.problem(),
                request.solution(),
                request.targetMarket(),
                request.funding(),
                request.equity(),
                request.teamSize(),
                request.timeline(),
                request.videoLink(),
                request.contactEmail());
        ideaRepository.save(idea);
        return toDetail(idea);
    }

    /** A user can express interest in an idea at most once — a second attempt is rejected
     * rather than silently updating the first (same policy as a duplicate job application). */
    @Transactional
    public IdeaInterestSummary submitInterest(UUID ideaId, UUID interestedUserId, IdeaInterestRequest request) {
        Idea idea = ideaRepository.findById(ideaId).orElseThrow(() -> new IdeaNotFoundException(ideaId));
        if (ideaInterestRepository.existsByIdeaIdAndInterestedUserId(ideaId, interestedUserId)) {
            throw new DuplicateIdeaInterestException();
        }
        User interestedUser = userRepository.findById(interestedUserId).orElseThrow();
        IdeaInterest interest = new IdeaInterest(
                ideaId,
                idea.getTitle(),
                idea.getSubmitterName(),
                interestedUserId,
                interestedUser.getFullName(),
                request.role(),
                request.ticketSize(),
                request.message());
        interest = ideaInterestRepository.save(interest);
        idea.incrementInterestedCount();
        ideaRepository.save(idea);
        if (!idea.getSubmitterId().equals(interestedUserId)) {
            notificationService.notify(
                    idea.getSubmitterId(),
                    NotificationType.IDEA_INTEREST_RECEIVED,
                    interestedUser.getFullName() + " expressed interest in your idea \"" + idea.getTitle() + "\".",
                    "/partnerships/ideas/" + idea.getId());
        }
        return toInterestSummary(interest, false);
    }

    /** Only the idea's own submitter can see who has expressed interest in it. Contact details
     * (phone number, and a link to the full candidate profile) are an extra gate on top of that:
     * only included when the caller is on a paid plan — a candidate on the Plus (or higher) plan
     * (see CandidateBillingService), or a company on the Growth (or higher) plan AND admin-verified
     * (see CompanyBillingService / CompanyProfile.isVerified) — an unverified company never sees
     * contact details regardless of plan, same guard as CandidateSearchService's
     * requireEligibleToContactCandidates. */
    @Transactional(readOnly = true)
    public List<IdeaInterestSummary> getInterests(UUID ideaId, UUID callerId) {
        Idea idea = ideaRepository.findById(ideaId).orElseThrow(() -> new IdeaNotFoundException(ideaId));
        if (!idea.getSubmitterId().equals(callerId)) {
            throw new IdeaAccessDeniedException();
        }
        boolean canSeeContactDetails = canSeeInterestContactDetails(callerId);
        return ideaInterestRepository.findByIdeaIdOrderByCreatedAtDesc(ideaId).stream()
                .map(interest -> toInterestSummary(interest, canSeeContactDetails))
                .toList();
    }

    private boolean canSeeInterestContactDetails(UUID callerId) {
        User caller = userRepository.findById(callerId).orElseThrow();
        if (caller.getRole() == UserRole.COMPANY) {
            boolean verified = companyProfileRepository
                    .findByUserId(callerId)
                    .map(CompanyProfile::isVerified)
                    .orElse(false);
            if (!verified) {
                return false;
            }
            return companyBillingService.getPlanPeriod(callerId).plan() != CompanySubscriptionPlan.FREE;
        }
        return candidateBillingService.getCurrentPlan(callerId) != SubscriptionPlan.FREE;
    }

    /** The ideas a user has themselves expressed interest in (as investor/participant) — backs
     * ApplicationsPage's Partnership tab. Unlike getInterests(), this has no owner check: it's
     * always scoped to the caller's own interests. */
    @Transactional(readOnly = true)
    public List<MyIdeaInterestSummary> getMyInterests(UUID interestedUserId) {
        return ideaInterestRepository.findByInterestedUserIdOrderByCreatedAtDesc(interestedUserId).stream()
                .map(interest -> new MyIdeaInterestSummary(
                        interest.getId(),
                        interest.getIdeaId(),
                        interest.getIdeaTitle(),
                        interest.getIdeaSubmitterName(),
                        interest.getRole(),
                        interest.getTicketSize(),
                        interest.getMessage(),
                        interest.getCreatedAt()))
                .toList();
    }

    private IdeaInterestSummary toInterestSummary(IdeaInterest interest, boolean includeContactDetails) {
        // Only a candidate has a profile a company can view (see CandidateProfileForCompany /
        // CandidateSearchController) — an interested company (e.g. an investor) has no such page,
        // so candidateUserId stays null for them even when includeContactDetails is true.
        Optional<CandidateProfile> candidateProfile = includeContactDetails
                ? candidateProfileRepository.findByUserId(interest.getInterestedUserId())
                : Optional.empty();
        return new IdeaInterestSummary(
                interest.getId(),
                interest.getInterestedUserName(),
                interest.getRole(),
                interest.getTicketSize(),
                interest.getMessage(),
                candidateProfile.map(CandidateProfile::getMobile).orElse(null),
                candidateProfile.map(CandidateProfile::getUserId).orElse(null),
                interest.getCreatedAt());
    }

    private void notifyAdminsIdeaPending(Idea idea) {
        notificationService.notifyAdmins(
                NotificationType.IDEA_PENDING_APPROVAL,
                "New idea \"" + idea.getTitle() + "\" from " + idea.getSubmitterName() + " is awaiting approval.",
                "/admin/approvals/ideas");
    }

    private Idea findOwned(UUID id, UUID submitterId) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        if (!idea.getSubmitterId().equals(submitterId)) {
            throw new IdeaAccessDeniedException();
        }
        return idea;
    }

    private IdeaSummary toSummary(Idea idea) {
        return new IdeaSummary(
                idea.getId(),
                idea.getTitle(),
                idea.getCategory(),
                idea.getStage(),
                idea.getProblem(),
                idea.getSubmitterName(),
                idea.getSubmitterRole(),
                idea.getFunding(),
                idea.getTeamSize(),
                idea.getTimeline(),
                idea.getStatus(),
                idea.isEdited(),
                idea.getInterestedCount(),
                idea.getFeaturedAt() != null,
                idea.getCreatedAt());
    }

    private IdeaDetail toDetail(Idea idea) {
        return new IdeaDetail(
                idea.getId(),
                idea.getSubmitterName(),
                idea.getSubmitterRole(),
                idea.getTitle(),
                idea.getCategory(),
                idea.getStage(),
                idea.getProblem(),
                idea.getSolution(),
                idea.getTargetMarket(),
                idea.getFunding(),
                idea.getEquity(),
                idea.getTeamSize(),
                idea.getTimeline(),
                idea.getVideoLink(),
                idea.getContactEmail(),
                idea.getStatus(),
                idea.isEdited(),
                idea.getInterestedCount(),
                idea.getFeaturedAt() != null,
                idea.getCreatedAt());
    }
}
