package com.openopportunity.idea;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {}
