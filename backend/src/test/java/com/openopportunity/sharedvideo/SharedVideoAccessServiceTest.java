package com.openopportunity.sharedvideo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.openopportunity.sharedvideo.dto.SharedVideoMetadata;
import com.openopportunity.sharedvideo.exception.SharedVideoLinkNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

@ExtendWith(MockitoExtension.class)
class SharedVideoAccessServiceTest {

    @Mock
    private AdminSharedVideoRepository videoRepository;

    @Mock
    private AdminVideoShareRepository shareRepository;

    @Mock
    private FileStorageService fileStorageService;

    private SharedVideoAccessService service() {
        return new SharedVideoAccessService(videoRepository, shareRepository, fileStorageService);
    }

    @Test
    void getMetadataRecordsAViewAndReturnsTheVideoUrl() {
        SharedVideoAccessService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo video", "key-1", "video/mp4", 100L, 120);
        AdminVideoShare share = new AdminVideoShare(video.getId(), "Rohan", "rohan@example.com", "tok-1");
        when(shareRepository.findByShareToken("tok-1")).thenReturn(Optional.of(share));
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));

        SharedVideoMetadata metadata = service.getMetadata("tok-1");

        assertThat(metadata.title()).isEqualTo("Demo video");
        assertThat(metadata.videoUrl()).isEqualTo("/api/shared-videos/tok-1/video");
        assertThat(metadata.durationSeconds()).isEqualTo(120);
        assertThat(share.getViewCount()).isEqualTo(1);
        assertThat(share.getFirstViewedAt()).isNotNull();
    }

    @Test
    void getMetadataRejectsAnUnknownToken() {
        SharedVideoAccessService service = service();
        when(shareRepository.findByShareToken("bad-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMetadata("bad-token"))
                .isInstanceOf(SharedVideoLinkNotFoundException.class);
    }

    @Test
    void recordProgressOnlyMovesForwardNeverBackward() {
        SharedVideoAccessService service = service();
        AdminVideoShare share = new AdminVideoShare(UUID.randomUUID(), "Rohan", "rohan@example.com", "tok-1");
        share.recordProgress(80, Instant.now());
        when(shareRepository.findByShareToken("tok-1")).thenReturn(Optional.of(share));

        service.recordProgress("tok-1", 30);

        assertThat(share.getMaxWatchedSeconds()).isEqualTo(80);
    }

    @Test
    void recordProgressAdvancesWhenFurtherThanBefore() {
        SharedVideoAccessService service = service();
        AdminVideoShare share = new AdminVideoShare(UUID.randomUUID(), "Rohan", "rohan@example.com", "tok-1");
        share.recordProgress(30, Instant.now());
        when(shareRepository.findByShareToken("tok-1")).thenReturn(Optional.of(share));

        service.recordProgress("tok-1", 80);

        assertThat(share.getMaxWatchedSeconds()).isEqualTo(80);
    }

    @Test
    void loadVideoResourceReturnsTheStoredFileAndContentType() throws Exception {
        SharedVideoAccessService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo", "key-1", "video/mp4", 100L, null);
        AdminVideoShare share = new AdminVideoShare(video.getId(), "Rohan", "rohan@example.com", "tok-1");
        when(shareRepository.findByShareToken("tok-1")).thenReturn(Optional.of(share));
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));
        Resource resource = new ByteArrayResource("bytes".getBytes());
        when(fileStorageService.load("key-1")).thenReturn(resource);

        SharedVideoAccessService.LoadedSharedVideo loaded = service.loadVideoResource("tok-1");

        assertThat(loaded.resource()).isSameAs(resource);
        assertThat(loaded.contentType()).isEqualTo("video/mp4");
    }
}
