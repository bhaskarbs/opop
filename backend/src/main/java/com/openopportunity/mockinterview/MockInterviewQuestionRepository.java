package com.openopportunity.mockinterview;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockInterviewQuestionRepository extends JpaRepository<MockInterviewQuestion, UUID> {

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
