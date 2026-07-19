package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MockInterviewService {

    private static final long MAX_VIDEO_SIZE_BYTES = 150L * 1024 * 1024;

    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final FileStorageService fileStorageService;

    public MockInterviewService(
            MockInterviewSessionRepository mockInterviewSessionRepository, FileStorageService fileStorageService) {
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public MockInterviewSessionSummary create(
            UUID candidateId, MultipartFile video, String category, int questionCount, int durationSeconds) {
        validate(video);

        String storageKey;
        try {
            storageKey = fileStorageService.store(video, "mock-interviews/" + candidateId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store mock interview recording", ex);
        }

        MockInterviewSession session = new MockInterviewSession(
                candidateId,
                category,
                questionCount,
                durationSeconds,
                storageKey,
                video.getContentType() != null ? video.getContentType() : "video/webm",
                video.getSize());
        session = mockInterviewSessionRepository.save(session);
        return toSummary(session);
    }

    @Transactional(readOnly = true)
    public List<MockInterviewSessionSummary> getMine(UUID candidateId) {
        return mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    /** A session's video is only ever visible to the candidate who recorded it — a non-owner
     * gets the same "not found" as a truly unknown id, matching IdeaService.get()'s treatment
     * of a non-owner requesting an unapproved idea. */
    @Transactional(readOnly = true)
    public LoadedVideo getVideo(UUID sessionId, UUID candidateId) {
        MockInterviewSession session = mockInterviewSessionRepository
                .findById(sessionId)
                .filter(s -> s.getCandidateId().equals(candidateId))
                .orElseThrow(() -> new MockInterviewSessionNotFoundException(sessionId));
        try {
            Resource resource = fileStorageService.load(session.getVideoStorageKey());
            return new LoadedVideo(resource, session.getVideoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load mock interview recording", ex);
        }
    }

    private void validate(MultipartFile video) {
        if (video.isEmpty()) {
            throw new InvalidMockInterviewVideoException("Recording is empty");
        }
        if (video.getSize() > MAX_VIDEO_SIZE_BYTES) {
            throw new InvalidMockInterviewVideoException("Recording must be 150MB or smaller");
        }
        String contentType = video.getContentType();
        if (contentType == null || !contentType.startsWith("video/")) {
            throw new InvalidMockInterviewVideoException("Recording must be a video file");
        }
    }

    private MockInterviewSessionSummary toSummary(MockInterviewSession session) {
        return new MockInterviewSessionSummary(
                session.getId(),
                session.getCategory(),
                session.getQuestionCount(),
                session.getDurationSeconds(),
                session.getRecordedAt());
    }

    public record LoadedVideo(Resource resource, String contentType) {}
}
