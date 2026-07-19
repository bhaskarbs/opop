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

    // Both null when the browser couldn't produce a thumbnail client-side — MockInterviewService
    // treats that as "no thumbnail" rather than a failure (see MockInterviewController.thumbnail).
    @Column(name = "thumbnail_storage_key", updatable = false, length = 500)
    private String thumbnailStorageKey;

    @Column(name = "thumbnail_content_type", updatable = false, length = 100)
    private String thumbnailContentType;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    protected MockInterviewSession() {
        // JPA
    }

    public MockInterviewSession(
            UUID candidateId,
            int questionCount,
            int durationSeconds,
            String videoStorageKey,
            String videoContentType,
            long videoSizeBytes,
            String thumbnailStorageKey,
            String thumbnailContentType) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.questionCount = questionCount;
        this.durationSeconds = durationSeconds;
        this.videoStorageKey = videoStorageKey;
        this.videoContentType = videoContentType;
        this.videoSizeBytes = videoSizeBytes;
        this.thumbnailStorageKey = thumbnailStorageKey;
        this.thumbnailContentType = thumbnailContentType;
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

    public String getThumbnailStorageKey() {
        return thumbnailStorageKey;
    }

    public String getThumbnailContentType() {
        return thumbnailContentType;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
