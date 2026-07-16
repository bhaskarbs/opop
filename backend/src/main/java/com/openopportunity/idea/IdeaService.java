package com.openopportunity.idea;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaRequest;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdeaService {

    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;

    public IdeaService(IdeaRepository ideaRepository, UserRepository userRepository) {
        this.ideaRepository = ideaRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public IdeaDetail create(UUID submitterId, IdeaRequest request) {
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
    public IdeaDetail getMine(UUID id, UUID submitterId) {
        Idea idea = findOwned(id, submitterId);
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

    private Idea findOwned(UUID id, UUID submitterId) {
        Idea idea = ideaRepository.findById(id).orElseThrow(() -> new IdeaNotFoundException(id));
        if (!idea.getSubmitterId().equals(submitterId)) {
            throw new IdeaAccessDeniedException();
        }
        return idea;
    }

    private IdeaDetail toDetail(Idea idea) {
        return new IdeaDetail(
                idea.getId(),
                idea.getSubmitterName(),
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
                idea.getCreatedAt());
    }
}
