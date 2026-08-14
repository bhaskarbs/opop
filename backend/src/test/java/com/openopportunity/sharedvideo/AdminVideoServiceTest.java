package com.openopportunity.sharedvideo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import com.openopportunity.sharedvideo.dto.AdminSharedVideoSummary;
import com.openopportunity.sharedvideo.dto.AdminVideoShareSummary;
import com.openopportunity.sharedvideo.dto.CreateVideoShareRequest;
import com.openopportunity.sharedvideo.exception.AdminSharedVideoNotFoundException;
import com.openopportunity.sharedvideo.exception.AdminVideoShareNotFoundException;
import com.openopportunity.sharedvideo.exception.InvalidSharedVideoException;
import com.openopportunity.storage.FileStorageService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class AdminVideoServiceTest {

    @Mock
    private AdminSharedVideoRepository videoRepository;

    @Mock
    private AdminVideoShareRepository shareRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private AdminVideoService service() {
        return new AdminVideoService(
                videoRepository, shareRepository, fileStorageService, asyncEmailSender, "http://localhost:5173");
    }

    @Test
    void uploadStoresTheFileAndPersistsAVideoRow() throws Exception {
        AdminVideoService service = service();
        UUID adminId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile("file", "demo.mp4", "video/mp4", "not-really-a-video".getBytes());
        when(fileStorageService.store(any(org.springframework.web.multipart.MultipartFile.class), anyString()))
                .thenReturn("shared-videos/" + adminId + "/demo.mp4");

        AdminSharedVideoSummary summary = service.upload(adminId, file, "Demo video", 90);

        assertThat(summary.title()).isEqualTo("Demo video");
        assertThat(summary.durationSeconds()).isEqualTo(90);
        assertThat(summary.shareCount()).isZero();
        verify(videoRepository).save(any(AdminSharedVideo.class));
    }

    @Test
    void uploadFallsBackToTheOriginalFilenameWhenNoTitleIsGiven() throws Exception {
        AdminVideoService service = service();
        UUID adminId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile("file", "demo.mp4", "video/mp4", "bytes".getBytes());
        when(fileStorageService.store(any(org.springframework.web.multipart.MultipartFile.class), anyString()))
                .thenReturn("key");

        AdminSharedVideoSummary summary = service.upload(adminId, file, null, null);

        assertThat(summary.title()).isEqualTo("demo.mp4");
    }

    @Test
    void uploadRejectsANonVideoContentType() {
        AdminVideoService service = service();
        MockMultipartFile file = new MockMultipartFile("file", "demo.txt", "text/plain", "bytes".getBytes());

        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), file, "Demo", null))
                .isInstanceOf(InvalidSharedVideoException.class);
        verify(videoRepository, never()).save(any());
    }

    @Test
    void uploadRejectsAnEmptyFile() {
        AdminVideoService service = service();
        MockMultipartFile file = new MockMultipartFile("file", "demo.mp4", "video/mp4", new byte[0]);

        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), file, "Demo", null))
                .isInstanceOf(InvalidSharedVideoException.class);
    }

    @Test
    void deleteRemovesTheStoredFileAndTheVideoRow() throws Exception {
        AdminVideoService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo", "key-1", "video/mp4", 100L, null);
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));

        service.delete(video.getId());

        verify(fileStorageService).delete("key-1");
        verify(videoRepository).delete(video);
    }

    @Test
    void deleteRejectsAnUnknownVideo() {
        AdminVideoService service = service();
        UUID videoId = UUID.randomUUID();
        when(videoRepository.findById(videoId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(videoId)).isInstanceOf(AdminSharedVideoNotFoundException.class);
    }

    @Test
    void createShareSavesAShareAndEmailsTheRecipient() {
        AdminVideoService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo video", "key-1", "video/mp4", 100L, 120);
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));
        CreateVideoShareRequest request = new CreateVideoShareRequest("Rohan Mehta", "rohan@example.com");

        AdminVideoShareSummary summary = service.createShare(video.getId(), request);

        assertThat(summary.recipientName()).isEqualTo("Rohan Mehta");
        assertThat(summary.shareUrl()).startsWith("http://localhost:5173/en/watch/");
        assertThat(summary.maxWatchedSeconds()).isZero();
        assertThat(summary.watchedPercent()).isZero();

        ArgumentCaptor<AdminVideoShare> captor = ArgumentCaptor.forClass(AdminVideoShare.class);
        verify(shareRepository).save(captor.capture());
        assertThat(captor.getValue().getShareToken()).isNotBlank();

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
    }

    @Test
    void createShareRejectsAnUnknownVideo() {
        AdminVideoService service = service();
        UUID videoId = UUID.randomUUID();
        when(videoRepository.findById(videoId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createShare(videoId, new CreateVideoShareRequest("A", "a@example.com")))
                .isInstanceOf(AdminSharedVideoNotFoundException.class);
    }

    @Test
    void deleteShareRemovesTheShareRow() {
        AdminVideoService service = service();
        UUID videoId = UUID.randomUUID();
        AdminVideoShare share = new AdminVideoShare(videoId, "Rohan", "rohan@example.com", "tok-1");
        when(shareRepository.findById(share.getId())).thenReturn(Optional.of(share));

        service.deleteShare(videoId, share.getId());

        verify(shareRepository).delete(share);
    }

    @Test
    void deleteShareRejectsAnUnknownShare() {
        AdminVideoService service = service();
        UUID videoId = UUID.randomUUID();
        UUID shareId = UUID.randomUUID();
        when(shareRepository.findById(shareId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteShare(videoId, shareId))
                .isInstanceOf(AdminVideoShareNotFoundException.class);
    }

    @Test
    void deleteShareRejectsAShareThatBelongsToADifferentVideo() {
        AdminVideoService service = service();
        UUID otherVideoId = UUID.randomUUID();
        AdminVideoShare share = new AdminVideoShare(otherVideoId, "Rohan", "rohan@example.com", "tok-1");
        when(shareRepository.findById(share.getId())).thenReturn(Optional.of(share));

        assertThatThrownBy(() -> service.deleteShare(UUID.randomUUID(), share.getId()))
                .isInstanceOf(AdminVideoShareNotFoundException.class);
        verify(shareRepository, never()).delete(any());
    }

    @Test
    void listSharesComputesWatchedPercentWhenDurationIsKnown() {
        AdminVideoService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo", "key-1", "video/mp4", 100L, 200);
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));
        AdminVideoShare share = new AdminVideoShare(video.getId(), "Rohan", "rohan@example.com", "tok-1");
        share.recordProgress(50, java.time.Instant.now());
        when(shareRepository.findByVideoIdOrderByCreatedAtDesc(video.getId())).thenReturn(List.of(share));

        List<AdminVideoShareSummary> shares = service.listShares(video.getId());

        assertThat(shares).hasSize(1);
        assertThat(shares.get(0).watchedPercent()).isEqualTo(25);
    }

    @Test
    void listSharesLeavesWatchedPercentNullWhenDurationIsUnknown() {
        AdminVideoService service = service();
        AdminSharedVideo video = new AdminSharedVideo(UUID.randomUUID(), "Demo", "key-1", "video/mp4", 100L, null);
        when(videoRepository.findById(video.getId())).thenReturn(Optional.of(video));
        AdminVideoShare share = new AdminVideoShare(video.getId(), "Rohan", "rohan@example.com", "tok-1");
        share.recordProgress(50, java.time.Instant.now());
        when(shareRepository.findByVideoIdOrderByCreatedAtDesc(video.getId())).thenReturn(List.of(share));

        List<AdminVideoShareSummary> shares = service.listShares(video.getId());

        assertThat(shares.get(0).watchedPercent()).isNull();
        assertThat(shares.get(0).maxWatchedSeconds()).isEqualTo(50);
    }
}
