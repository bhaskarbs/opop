package com.openopportunity.mockinterview;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/** One (candidate, question) pairing that's already been asked — see
 * MockInterviewQuestionService.getSessionQuestions, which excludes these from both the bank pick
 * and the AI-generation path so a candidate is never served the same question twice. */
@Entity
@Table(
        name = "mock_interview_asked_questions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"candidate_id", "question_id"}))
public class MockInterviewAskedQuestion {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Column(name = "question_id", nullable = false, updatable = false)
    private UUID questionId;

    @Column(name = "asked_at", nullable = false, updatable = false)
    private Instant askedAt;

    protected MockInterviewAskedQuestion() {
        // JPA
    }

    public MockInterviewAskedQuestion(UUID candidateId, UUID questionId) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.questionId = questionId;
    }

    @PrePersist
    void onCreate() {
        askedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public Instant getAskedAt() {
        return askedAt;
    }
}
