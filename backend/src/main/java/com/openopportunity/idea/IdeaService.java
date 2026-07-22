package com.openopportunity.idea;

import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.billing.CandidateBillingService;
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
import java.util.List;
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

    public IdeaService(
            IdeaRepository ideaRepository,
            UserRepository userRepository,
            IdeaInterestRepository ideaInterestRepository,
            NotificationService notificationService,
            CandidateProfileRepository candidateProfileRepository,
            CandidateBillingService candidateBillingService) {
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.notificationService = notificationService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.candidateBillingService = candidateBillingService;
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
        return toDetail(idea);
    }

    @Transactional(readOnly = true)
    public List<IdeaSummary> browse(String q, String category, IdeaStage stage) {
        Specification<Idea> spec = Specification.allOf(
                IdeaSpecifications.hasStatus(IdeaStatus.APPROVED),
                IdeaSpecifications.matchesKeyword(q),
                IdeaSpecifications.hasCategory(category),
                IdeaSpecifications.hasStage(stage));
        return ideaRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toSummary)
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

    @Transactional(readOnly = true)
    public List<IdeaSummary> getPending() {
        return ideaRepository.findByStatusOrderByCreatedAtDesc(IdeaStatus.PENDING).stream()
                .map(this::toSummary)
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
    public IdeaDetail reject(UUID id) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        idea.reject();
        ideaRepository.save(idea);
        notificationService.notify(
                idea.getSubmitterId(),
                NotificationType.IDEA_REJECTED,
                "Your idea \"" + idea.getTitle() + "\" was not approved.",
                "/partnerships/ideas/" + idea.getId());
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

    /** Only the idea's own submitter can see who has expressed interest in it. Contact numbers
     * are an extra gate on top of that: only included when the caller is a candidate on the
     * Plus (or higher) plan — see CandidateBillingService. A company owner (no subscription
     * concept exists for companies yet) simply resolves to FREE and never sees them. */
    @Transactional(readOnly = true)
    public List<IdeaInterestSummary> getInterests(UUID ideaId, UUID callerId) {
        Idea idea = ideaRepository.findById(ideaId).orElseThrow(() -> new IdeaNotFoundException(ideaId));
        if (!idea.getSubmitterId().equals(callerId)) {
            throw new IdeaAccessDeniedException();
        }
        boolean canSeeContactNumbers = candidateBillingService.getCurrentPlan(callerId) != SubscriptionPlan.FREE;
        return ideaInterestRepository.findByIdeaIdOrderByCreatedAtDesc(ideaId).stream()
                .map(interest -> toInterestSummary(interest, canSeeContactNumbers))
                .toList();
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

    private IdeaInterestSummary toInterestSummary(IdeaInterest interest, boolean includeContactNumber) {
        String contactNumber = includeContactNumber
                ? candidateProfileRepository
                        .findByUserId(interest.getInterestedUserId())
                        .map(CandidateProfile::getMobile)
                        .orElse(null)
                : null;
        return new IdeaInterestSummary(
                interest.getId(),
                interest.getInterestedUserName(),
                interest.getRole(),
                interest.getTicketSize(),
                interest.getMessage(),
                contactNumber,
                interest.getCreatedAt());
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
                idea.getCreatedAt());
    }
}
