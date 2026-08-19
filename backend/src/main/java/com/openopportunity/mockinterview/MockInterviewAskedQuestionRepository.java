package com.openopportunity.mockinterview;

import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MockInterviewAskedQuestionRepository extends JpaRepository<MockInterviewAskedQuestion, UUID> {

    @Query("select a.questionId from MockInterviewAskedQuestion a where a.candidateId = :candidateId")
    Set<UUID> findQuestionIdsByCandidateId(@Param("candidateId") UUID candidateId);
}
