package com.openopportunity.idea;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface IdeaRepository extends JpaRepository<Idea, UUID>, JpaSpecificationExecutor<Idea> {

    List<Idea> findBySubmitterIdOrderByCreatedAtDesc(UUID submitterId);

    long countBySubmitterId(UUID submitterId);

    /** "Funding" is null whenever the submitter left it blank (see IdeaSubmitPage's
     * blankToNull) — an idea offering pure experience rather than seeking a specific
     * amount (see AdminReportsService.getPartnershipStats). */
    long countByStatusAndFundingIsNotNull(IdeaStatus status);

    long countByStatusAndFundingIsNull(IdeaStatus status);
}
