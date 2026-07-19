package com.openopportunity.mockinterview;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "mock_interview_sessions")
public class MockInterviewSession {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Column(nullable = false, updatable = false)
    private String category;

    @Column(name = "question_count", nullable = false, updatable = false)
    private int questionCount;

    @Column(name = "duration_seconds", nullable = false, updatable = false)
    private int durationSeconds;

    @Column(name = "video_storage_key", nullable = false, updatable = false, length = 500)
    private String videoStorageKey;

    @Column(name = "video_content_type", nullable = false, updatable = false, length = 100)
    private String videoContentType;

    @Column(name = "video_size_bytes", nullable = false, updatable = false)
    private long videoSizeBytes;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    protected MockInterviewSession() {
        // JPA
    }

    public MockInterviewSession(
            UUID candidateId,
            String category,
            int questionCount,
            int durationSeconds,
            String videoStorageKey,
            String videoContentType,
            long videoSizeBytes) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.category = category;
        this.questionCount = questionCount;
        this.durationSeconds = durationSeconds;
        this.videoStorageKey = videoStorageKey;
        this.videoContentType = videoContentType;
        this.videoSizeBytes = videoSizeBytes;
    }

    @PrePersist
    void onCreate() {
        recordedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public String getCategory() {
        return category;
    }

    public int getQuestionCount() {
        return questionCount;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public String getVideoStorageKey() {
        return videoStorageKey;
    }

    public String getVideoContentType() {
        return videoContentType;
    }

    public long getVideoSizeBytes() {
        return videoSizeBytes;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
