package com.openopportunity.sharedvideo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One recipient's unique link to a shared video (see AdminSharedVideo) — a video shared with 5
 * people has 5 of these, each with its own token and its own watch-progress tracking, so "who
 * watched how much" is answerable per person rather than as one anonymous aggregate. */
@Entity
@Table(name = "admin_video_shares")
public class AdminVideoShare {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "video_id", nullable = false, updatable = false)
    private UUID videoId;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "share_token", nullable = false, unique = true, updatable = false, length = 64)
    private String shareToken;

    @Column(name = "max_watched_seconds", nullable = false)
    private int maxWatchedSeconds;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "first_viewed_at")
    private Instant firstViewedAt;

    @Column(name = "last_viewed_at")
    private Instant lastViewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AdminVideoShare() {
        // JPA
    }

    public AdminVideoShare(UUID videoId, String recipientName, String recipientEmail, String shareToken) {
        this.id = UUID.randomUUID();
        this.videoId = videoId;
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.shareToken = shareToken;
        this.createdAt = Instant.now();
    }

    /** Called once per GET of the public watch page (see SharedVideoAccessService.getMetadata)
     * — every time the recipient (re)opens the link, not once ever. */
    public void recordView(Instant at) {
        if (firstViewedAt == null) {
            firstViewedAt = at;
        }
        lastViewedAt = at;
        viewCount++;
    }

    /** Called as the recipient's player reports playback position (see
     * SharedVideoAccessService.recordProgress) — only ever moves forward, so seeking backward
     * to rewatch a section doesn't make the tracked progress regress. */
    public void recordProgress(int watchedSeconds, Instant at) {
        if (watchedSeconds > maxWatchedSeconds) {
            maxWatchedSeconds = watchedSeconds;
        }
        lastViewedAt = at;
    }

    public UUID getId() {
        return id;
    }

    public UUID getVideoId() {
        return videoId;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getShareToken() {
        return shareToken;
    }

    public int getMaxWatchedSeconds() {
        return maxWatchedSeconds;
    }

    public int getViewCount() {
        return viewCount;
    }

    public Instant getFirstViewedAt() {
        return firstViewedAt;
    }

    public Instant getLastViewedAt() {
        return lastViewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
