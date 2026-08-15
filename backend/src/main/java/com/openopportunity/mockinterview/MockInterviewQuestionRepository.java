package com.openopportunity.mockinterview;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MockInterviewQuestionRepository extends JpaRepository<MockInterviewQuestion, UUID> {

    /** Candidate-facing matching: industry is a wildcard on either side (a null on the question
     * OR a null in the request both count as a match), same treatment
     * MockInterviewQuestionService.matchingQuestions gives experienceLevels/skills afterward in
     * Java — Postgres array containment isn't expressible in JPQL, same reason skills has always
     * been filtered in Java rather than here. */
    @Query("select q from MockInterviewQuestion q where "
            + "(:industry is null or q.industry is null or q.industry = :industry)")
    List<MockInterviewQuestion> findByOptionalFilters(@Param("industry") String industry);

    boolean existsByTextIgnoreCase(String text);

    List<MockInterviewQuestion> findAllByOrderByCreatedAtDesc();
}
