package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.billing.CandidateBillingService;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionLimitReachedException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class MockInterviewServiceTest {

    @Mock
    private MockInterviewSessionRepository mockInterviewSessionRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private CandidateBillingService candidateBillingService;

    private MockInterviewService mockInterviewService;

    @BeforeEach
    void setUp() {
        mockInterviewService =
                new MockInterviewService(mockInterviewSessionRepository, fileStorageService, candidateBillingService);
    }

    private MockMultipartFile sampleVideo() {
        return new MockMultipartFile("video", "interview.webm", "video/webm", new byte[] {1, 2, 3});
    }

    private MockInterviewSession sampleSession(UUID candidateId) {
        return new MockInterviewSession(
                candidateId,
                1,
                10,
                "mock-interviews/x.webm",
                "video/webm",
                3,
                "mock-interviews/x.jpg",
                "image/jpeg");
    }

    @Test
    void createStoresTheVideoAndSavesASession() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);
        when(fileStorageService.store(any(), anyString())).thenReturn("mock-interviews/" + candidateId + "/x.webm");
        when(mockInterviewSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockInterviewSessionSummary summary = mockInterviewService.create(candidateId, sampleVideo(), null, 8, 320);

        assertThat(summary.questionCount()).isEqualTo(8);
        assertThat(summary.durationSeconds()).isEqualTo(320);
        assertThat(summary.hasThumbnail()).isFalse();
    }

    @Test
    void createStoresAThumbnailWhenProvided() throws Exception {
        UUID candidateId = UUID.randomUUID();
        MockMultipartFile thumbnail = new MockMultipartFile("thumbnail", "thumb.jpg", "image/jpeg", new byte[] {9});
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);
        when(fileStorageService.store(any(), anyString())).thenReturn("mock-interviews/x");
        when(mockInterviewSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockInterviewSessionSummary summary =
                mockInterviewService.create(candidateId, sampleVideo(), thumbnail, 1, 10);

        assertThat(summary.hasThumbnail()).isTrue();
        verify(fileStorageService, times(2)).store(any(), anyString());
    }

    @Test
    void createRejectsAFourthSessionOnFreePlan() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(3L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);

        assertThatThrownBy(() -> mockInterviewService.create(candidateId, sampleVideo(), null, 1, 10))
                .isInstanceOf(MockInterviewSessionLimitReachedException.class);
        verify(fileStorageService, never()).store(any(), anyString());
    }

    @Test
    void createAllowsAFourthSessionOnPlusPlan() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(3L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.PLUS);
        when(fileStorageService.store(any(), anyString())).thenReturn("mock-interviews/x.webm");
        when(mockInterviewSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockInterviewSessionSummary summary = mockInterviewService.create(candidateId, sampleVideo(), null, 1, 10);

        assertThat(summary.questionCount()).isEqualTo(1);
    }

    @Test
    void createRejectsAnEleventhSessionOnPlusPlan() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(10L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.PLUS);

        assertThatThrownBy(() -> mockInterviewService.create(candidateId, sampleVideo(), null, 1, 10))
                .isInstanceOf(MockInterviewSessionLimitReachedException.class);
        verify(fileStorageService, never()).store(any(), anyString());
    }

    @Test
    void createNeverHitsTheLimitOnProPlan() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(1_000L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.PRO);
        when(fileStorageService.store(any(), anyString())).thenReturn("mock-interviews/x.webm");
        when(mockInterviewSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockInterviewSessionSummary summary = mockInterviewService.create(candidateId, sampleVideo(), null, 1, 10);

        assertThat(summary.questionCount()).isEqualTo(1);
    }

    @Test
    void createRejectsARecordingLongerThanTwentyMinutes() {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);

        assertThatThrownBy(
                        () -> mockInterviewService.create(candidateId, sampleVideo(), null, 1, 20 * 60 + 120))
                .isInstanceOf(InvalidMockInterviewVideoException.class);
    }

    @Test
    void createRejectsAnEmptyRecording() {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);
        MockMultipartFile empty = new MockMultipartFile("video", "interview.webm", "video/webm", new byte[0]);

        assertThatThrownBy(() -> mockInterviewService.create(candidateId, empty, null, 1, 10))
                .isInstanceOf(InvalidMockInterviewVideoException.class);
    }

    @Test
    void createRejectsANonVideoContentType() {
        UUID candidateId = UUID.randomUUID();
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(candidateBillingService.getCurrentPlan(candidateId)).thenReturn(SubscriptionPlan.FREE);
        MockMultipartFile notVideo = new MockMultipartFile("video", "notes.txt", "text/plain", new byte[] {1});

        assertThatThrownBy(() -> mockInterviewService.create(candidateId, notVideo, null, 1, 10))
                .isInstanceOf(InvalidMockInterviewVideoException.class);
    }

    @Test
    void getVideoRejectsANonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        MockInterviewSession session = sampleSession(ownerId);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> mockInterviewService.getVideo(session.getId(), otherId))
                .isInstanceOf(MockInterviewSessionNotFoundException.class);
    }

    @Test
    void getVideoReturnsTheStoredResourceForTheOwner() throws Exception {
        UUID ownerId = UUID.randomUUID();
        MockInterviewSession session = sampleSession(ownerId);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(fileStorageService.load("mock-interviews/x.webm")).thenReturn(new ByteArrayResource(new byte[] {1}));

        MockInterviewService.LoadedFile video = mockInterviewService.getVideo(session.getId(), ownerId);

        assertThat(video.contentType()).isEqualTo("video/webm");
    }

    @Test
    void getThumbnailRejectsWhenNoneWasStored() {
        UUID ownerId = UUID.randomUUID();
        MockInterviewSession session =
                new MockInterviewSession(ownerId, 1, 10, "mock-interviews/x.webm", "video/webm", 3, null, null);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> mockInterviewService.getThumbnail(session.getId(), ownerId))
                .isInstanceOf(MockInterviewSessionNotFoundException.class);
    }

    @Test
    void deleteRemovesTheSessionAndItsFiles() throws Exception {
        UUID ownerId = UUID.randomUUID();
        MockInterviewSession session = sampleSession(ownerId);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        mockInterviewService.delete(session.getId(), ownerId);

        verify(fileStorageService).delete("mock-interviews/x.webm");
        verify(fileStorageService).delete("mock-interviews/x.jpg");
        verify(mockInterviewSessionRepository).delete(session);
    }

    @Test
    void deleteRejectsANonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        MockInterviewSession session = sampleSession(ownerId);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> mockInterviewService.delete(session.getId(), otherId))
                .isInstanceOf(MockInterviewSessionNotFoundException.class);
    }

    @Test
    void getMineReturnsOnlyTheCallersOwnSessions() {
        UUID candidateId = UUID.randomUUID();
        MockInterviewSession session = sampleSession(candidateId);
        when(mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId))
                .thenReturn(List.of(session));

        var mine = mockInterviewService.getMine(candidateId);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).questionCount()).isEqualTo(1);
    }
}
