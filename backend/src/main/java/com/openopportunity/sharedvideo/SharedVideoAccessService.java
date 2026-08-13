package com.openopportunity.sharedvideo;

import com.openopportunity.sharedvideo.dto.SharedVideoMetadata;
import com.openopportunity.sharedvideo.exception.SharedVideoLinkNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The public, unauthenticated side of shared videos — everything reachable from a share token
 * alone, no login. See SecurityConfig's permitAll rule for "/api/shared-videos/**". Deliberately
 * a separate service from AdminVideoService even though they share the same two repositories:
 * this one's every method is safe to expose to a stranger holding nothing but a token, and
 * keeping that boundary in its own class makes it easy to audit that nothing admin-only ever
 * leaks through here. */
@Service
public class SharedVideoAccessService {

    private final AdminSharedVideoRepository videoRepository;
    private final AdminVideoShareRepository shareRepository;
    private final FileStorageService fileStorageService;

    public SharedVideoAccessService(
            AdminSharedVideoRepository videoRepository,
            AdminVideoShareRepository shareRepository,
            FileStorageService fileStorageService) {
        this.videoRepository = videoRepository;
        this.shareRepository = shareRepository;
        this.fileStorageService = fileStorageService;
    }

    /** Also counts as "the recipient opened this link" — bumps viewCount/first-and-last-viewed
     * every time this is called, not just once ever (see AdminVideoShare#recordView). */
    @Transactional
    public SharedVideoMetadata getMetadata(String token) {
        AdminVideoShare share = requireShare(token);
        AdminSharedVideo video = requireVideo(share.getVideoId());
        share.recordView(Instant.now());
        shareRepository.save(share);
        return new SharedVideoMetadata(
                video.getTitle(), "/api/shared-videos/" + token + "/video", video.getDurationSeconds());
    }

    @Transactional(readOnly = true)
    public LoadedSharedVideo loadVideoResource(String token) {
        AdminVideoShare share = requireShare(token);
        AdminSharedVideo video = requireVideo(share.getVideoId());
        try {
            Resource resource = fileStorageService.load(video.getStorageKey());
            return new LoadedSharedVideo(resource, video.getContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load shared video", ex);
        }
    }

    @Transactional
    public void recordProgress(String token, int watchedSeconds) {
        AdminVideoShare share = requireShare(token);
        share.recordProgress(watchedSeconds, Instant.now());
        shareRepository.save(share);
    }

    public record LoadedSharedVideo(Resource resource, String contentType) {}

    private AdminVideoShare requireShare(String token) {
        return shareRepository.findByShareToken(token).orElseThrow(SharedVideoLinkNotFoundException::new);
    }

    private AdminSharedVideo requireVideo(UUID videoId) {
        // The video row is only ever gone if an admin deleted it after this share was created
        // (cascade would've taken the share with it too, but a rare mid-request race is still
        // worth handling explicitly rather than NPEing) — same "invalid or expired" message a
        // stranger sees for a bad token, see SharedVideoLinkNotFoundException.
        return videoRepository.findById(videoId).orElseThrow(SharedVideoLinkNotFoundException::new);
    }
}
