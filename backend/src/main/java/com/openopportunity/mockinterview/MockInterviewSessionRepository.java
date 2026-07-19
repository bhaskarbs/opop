package com.openopportunity.mockinterview;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockInterviewSessionRepository extends JpaRepository<MockInterviewSession, UUID> {

    List<MockInterviewSession> findByCandidateIdOrderByRecordedAtDesc(UUID candidateId);
}
