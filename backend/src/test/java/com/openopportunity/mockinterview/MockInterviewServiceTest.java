package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
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

    private MockInterviewService mockInterviewService;

    @BeforeEach
    void setUp() {
        mockInterviewService = new MockInterviewService(mockInterviewSessionRepository, fileStorageService);
    }

    private MockMultipartFile sampleVideo() {
        return new MockMultipartFile("video", "interview.webm", "video/webm", new byte[] {1, 2, 3});
    }

    @Test
    void createStoresTheVideoAndSavesASession() throws Exception {
        UUID candidateId = UUID.randomUUID();
        when(fileStorageService.store(any(), anyString())).thenReturn("mock-interviews/" + candidateId + "/x.webm");
        when(mockInterviewSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MockInterviewSessionSummary summary =
                mockInterviewService.create(candidateId, sampleVideo(), "Frontend Developer — behavioral", 8, 320);

        assertThat(summary.category()).isEqualTo("Frontend Developer — behavioral");
        assertThat(summary.questionCount()).isEqualTo(8);
        assertThat(summary.durationSeconds()).isEqualTo(320);
    }

    @Test
    void createRejectsAnEmptyRecording() {
        MockMultipartFile empty = new MockMultipartFile("video", "interview.webm", "video/webm", new byte[0]);

        assertThatThrownBy(() -> mockInterviewService.create(UUID.randomUUID(), empty, "General soft skills", 1, 10))
                .isInstanceOf(InvalidMockInterviewVideoException.class);
    }

    @Test
    void createRejectsANonVideoContentType() {
        MockMultipartFile notVideo =
                new MockMultipartFile("video", "notes.txt", "text/plain", new byte[] {1});

        assertThatThrownBy(
                        () -> mockInterviewService.create(UUID.randomUUID(), notVideo, "General soft skills", 1, 10))
                .isInstanceOf(InvalidMockInterviewVideoException.class);
    }

    @Test
    void getVideoRejectsANonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        MockInterviewSession session = new MockInterviewSession(
                ownerId, "General soft skills", 1, 10, "mock-interviews/x.webm", "video/webm", 3);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> mockInterviewService.getVideo(session.getId(), otherId))
                .isInstanceOf(MockInterviewSessionNotFoundException.class);
    }

    @Test
    void getVideoReturnsTheStoredResourceForTheOwner() throws Exception {
        UUID ownerId = UUID.randomUUID();
        MockInterviewSession session = new MockInterviewSession(
                ownerId, "General soft skills", 1, 10, "mock-interviews/x.webm", "video/webm", 3);
        when(mockInterviewSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(fileStorageService.load("mock-interviews/x.webm")).thenReturn(new ByteArrayResource(new byte[] {1}));

        MockInterviewService.LoadedVideo video = mockInterviewService.getVideo(session.getId(), ownerId);

        assertThat(video.contentType()).isEqualTo("video/webm");
    }

    @Test
    void getMineReturnsOnlyTheCallersOwnSessions() {
        UUID candidateId = UUID.randomUUID();
        MockInterviewSession session = new MockInterviewSession(
                candidateId, "General soft skills", 1, 10, "mock-interviews/x.webm", "video/webm", 3);
        when(mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId))
                .thenReturn(List.of(session));

        var mine = mockInterviewService.getMine(candidateId);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).category()).isEqualTo("General soft skills");
    }
}
