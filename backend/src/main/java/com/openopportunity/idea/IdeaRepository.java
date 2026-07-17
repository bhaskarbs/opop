package com.openopportunity.idea;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface IdeaRepository extends JpaRepository<Idea, UUID>, JpaSpecificationExecutor<Idea> {

    List<Idea> findByStatusOrderByCreatedAtDesc(IdeaStatus status);
}
