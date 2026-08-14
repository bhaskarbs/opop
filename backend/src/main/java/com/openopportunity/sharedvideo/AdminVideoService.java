package com.openopportunity.sharedvideo;

import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import com.openopportunity.sharedvideo.dto.AdminSharedVideoSummary;
import com.openopportunity.sharedvideo.dto.AdminVideoShareSummary;
import com.openopportunity.sharedvideo.dto.CreateVideoShareRequest;
import com.openopportunity.sharedvideo.exception.AdminSharedVideoNotFoundException;
import com.openopportunity.sharedvideo.exception.AdminVideoShareNotFoundException;
import com.openopportunity.sharedvideo.exception.InvalidSharedVideoException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Admin-side management of shared videos — upload, list, delete, and per-recipient share-link
 * creation (with a best-effort notification email, see AsyncEmailSender). Watching and progress
 * tracking is the separate, public-facing SharedVideoAccessService — this class never runs
 * without an authenticated admin behind it (see SecurityConfig's /api/admin/** rule). */
@Service
public class AdminVideoService {

    // Matches the app-wide multipart ceiling (spring.servlet.multipart.max-file-size) and
    // MockInterviewService's own recording cap — same reasoning: a request can't succeed past
    // that ceiling regardless, so this just gives a clearer error than a raw 413 would.
    private static final long MAX_VIDEO_SIZE_BYTES = 150L * 1024 * 1024;

    private final AdminSharedVideoRepository videoRepository;
    private final AdminVideoShareRepository shareRepository;
    private final FileStorageService fileStorageService;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminVideoService(
            AdminSharedVideoRepository videoRepository,
            AdminVideoShareRepository shareRepository,
            FileStorageService fileStorageService,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.videoRepository = videoRepository;
        this.shareRepository = shareRepository;
        this.fileStorageService = fileStorageService;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional(readOnly = true)
    public List<AdminSharedVideoSummary> list() {
        return videoRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(video -> toSummary(video, (int) shareRepository.countByVideoId(video.getId())))
                .toList();
    }

    @Transactional
    public AdminSharedVideoSummary upload(UUID adminId, MultipartFile file, String title, Integer durationSeconds) {
        validate(file);
        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "shared-videos/" + adminId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store shared video", ex);
        }
        String resolvedTitle = (title == null || title.isBlank()) ? file.getOriginalFilename() : title.trim();
        AdminSharedVideo video = new AdminSharedVideo(
                adminId, resolvedTitle, storageKey, file.getContentType(), file.getSize(), durationSeconds);
        videoRepository.save(video);
        return toSummary(video, 0);
    }

    @Transactional
    public void delete(UUID videoId) {
        AdminSharedVideo video =
                videoRepository.findById(videoId).orElseThrow(() -> new AdminSharedVideoNotFoundException(videoId));
        try {
            fileStorageService.delete(video.getStorageKey());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to delete shared video", ex);
        }
        // Cascades admin_video_shares automatically (real DB-level FK with ON DELETE CASCADE) —
        // those rows carry no files of their own, so nothing further to clean up by hand.
        videoRepository.delete(video);
    }

    @Transactional
    public AdminVideoShareSummary createShare(UUID videoId, CreateVideoShareRequest request) {
        AdminSharedVideo video =
                videoRepository.findById(videoId).orElseThrow(() -> new AdminSharedVideoNotFoundException(videoId));
        String token = generateToken();
        AdminVideoShare share =
                new AdminVideoShare(videoId, request.recipientName().trim(), request.recipientEmail().trim(), token);
        shareRepository.save(share);

        String shareUrl = shareUrl(token);
        asyncEmailSender.sendBestEffort(
                share.getRecipientEmail(),
                "A video has been shared with you: " + video.getTitle(),
                "A video has been shared with you",
                List.of(
                        "Hi " + share.getRecipientName() + ",",
                        video.getTitle() + " has been shared with you. Click below to watch it."),
                new EmailButton("Watch video", shareUrl),
                () -> {});
        return toSummary(share, video.getDurationSeconds());
    }

    @Transactional
    public void deleteShare(UUID videoId, UUID shareId) {
        AdminVideoShare share =
                shareRepository.findById(shareId).orElseThrow(() -> new AdminVideoShareNotFoundException(shareId));
        if (!share.getVideoId().equals(videoId)) {
            throw new AdminVideoShareNotFoundException(shareId);
        }
        shareRepository.delete(share);
    }

    @Transactional(readOnly = true)
    public List<AdminVideoShareSummary> listShares(UUID videoId) {
        AdminSharedVideo video =
                videoRepository.findById(videoId).orElseThrow(() -> new AdminSharedVideoNotFoundException(videoId));
        return shareRepository.findByVideoIdOrderByCreatedAtDesc(videoId).stream()
                .map(share -> toSummary(share, video.getDurationSeconds()))
                .toList();
    }

    private String shareUrl(String token) {
        return frontendBaseUrl + "/en/watch/" + token;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static AdminSharedVideoSummary toSummary(AdminSharedVideo video, int shareCount) {
        return new AdminSharedVideoSummary(
                video.getId(),
                video.getTitle(),
                video.getContentType(),
                video.getSizeBytes(),
                video.getDurationSeconds(),
                shareCount,
                video.getCreatedAt());
    }

    private AdminVideoShareSummary toSummary(AdminVideoShare share, Integer videoDurationSeconds) {
        Integer watchedPercent = videoDurationSeconds == null || videoDurationSeconds == 0
                ? null
                : (int) Math.min(100, Math.round(share.getMaxWatchedSeconds() * 100.0 / videoDurationSeconds));
        return new AdminVideoShareSummary(
                share.getId(),
                share.getRecipientName(),
                share.getRecipientEmail(),
                shareUrl(share.getShareToken()),
                share.getMaxWatchedSeconds(),
                watchedPercent,
                share.getViewCount(),
                share.getFirstViewedAt(),
                share.getLastViewedAt(),
                share.getCreatedAt());
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidSharedVideoException("Video file is empty");
        }
        if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
            throw new InvalidSharedVideoException("Video must be 150MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("video/")) {
            throw new InvalidSharedVideoException("File must be a video");
        }
    }
}
