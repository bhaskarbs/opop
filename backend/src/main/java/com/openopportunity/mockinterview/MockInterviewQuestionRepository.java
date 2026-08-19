package com.openopportunity.mockinterview;

import java.util.List;
import java.util.Optional;
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

    /** Used by MockInterviewQuestionService's AI-generation path to resolve a freshly generated
     * question back to its existing bank entity (with a real id) when the unique index on
     * lower(text) means it's actually a re-generation of something already banked — needed so
     * that question can still be checked against/recorded into the candidate's asked-question
     * history, the same as any other bank entity. */
    Optional<MockInterviewQuestion> findByTextIgnoreCase(String text);

    /** Same duplicate check as existsByTextIgnoreCase, but excluding the question being edited
     * itself — otherwise saving a question's other fields without changing its text would trip
     * over its own existing row (see AdminMockInterviewQuestionService.update). */
    boolean existsByTextIgnoreCaseAndIdNot(String text, UUID id);

    List<MockInterviewQuestion> findAllByOrderByCreatedAtDesc();
}
