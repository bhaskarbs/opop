package com.openopportunity.idea;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdeaInterestRepository extends JpaRepository<IdeaInterest, UUID> {

    boolean existsByIdeaIdAndInterestedUserId(UUID ideaId, UUID interestedUserId);

    List<IdeaInterest> findByIdeaIdOrderByCreatedAtDesc(UUID ideaId);

    List<IdeaInterest> findByInterestedUserIdOrderByCreatedAtDesc(UUID interestedUserId);
}
