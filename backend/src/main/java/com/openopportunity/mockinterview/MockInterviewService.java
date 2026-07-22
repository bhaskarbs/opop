package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionLimitReachedException;
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
    // Flat across every plan — mock interview sessions are no longer a plan differentiator
    // (Plus/Pro previously got 10/unlimited; see candidate.json billing copy, updated to match).
    private static final int MAX_SESSIONS = 3;
    // The frontend auto-stops recording at 20 minutes (see MockInterviewPage); this is a
    // defensive server-side backstop against a modified/buggy client, with slack for the time
    // between the auto-stop firing and the upload actually landing.
    private static final int MAX_DURATION_SECONDS = 20 * 60 + 60;

    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final FileStorageService fileStorageService;

    public MockInterviewService(
            MockInterviewSessionRepository mockInterviewSessionRepository, FileStorageService fileStorageService) {
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public MockInterviewSessionSummary create(
            UUID candidateId, MultipartFile video, MultipartFile thumbnail, int questionCount, int durationSeconds) {
        if (mockInterviewSessionRepository.countByCandidateId(candidateId) >= MAX_SESSIONS) {
            throw new MockInterviewSessionLimitReachedException();
        }
        if (durationSeconds > MAX_DURATION_SECONDS) {
            throw new InvalidMockInterviewVideoException("Recording must be 20 minutes or shorter");
        }
        validate(video);

        String videoStorageKey = store(video, "mock-interviews/" + candidateId);
        // The thumbnail is best-effort — the client may not have been able to generate one
        // (see MockInterviewPage's generateThumbnail), so a missing/empty file just means no
        // thumbnail rather than a failed upload.
        String thumbnailStorageKey =
                thumbnail != null && !thumbnail.isEmpty() ? store(thumbnail, "mock-interviews/" + candidateId) : null;

        MockInterviewSession session = new MockInterviewSession(
                candidateId,
                questionCount,
                durationSeconds,
                videoStorageKey,
                video.getContentType() != null ? video.getContentType() : "video/webm",
                video.getSize(),
                thumbnailStorageKey,
                thumbnailStorageKey != null ? thumbnail.getContentType() : null);
        session = mockInterviewSessionRepository.save(session);
        return toSummary(session);
    }

    @Transactional(readOnly = true)
    public List<MockInterviewSessionSummary> getMine(UUID candidateId) {
        return mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    /** A session's video/thumbnail are only ever visible to the candidate who recorded it — a
     * non-owner gets the same "not found" as a truly unknown id, matching IdeaService.get()'s
     * treatment of a non-owner requesting an unapproved idea. */
    @Transactional(readOnly = true)
    public LoadedFile getVideo(UUID sessionId, UUID candidateId) {
        MockInterviewSession session = findOwned(sessionId, candidateId);
        return load(session.getVideoStorageKey(), session.getVideoContentType());
    }

    @Transactional(readOnly = true)
    public LoadedFile getThumbnail(UUID sessionId, UUID candidateId) {
        MockInterviewSession session = findOwned(sessionId, candidateId);
        if (session.getThumbnailStorageKey() == null) {
            throw new MockInterviewSessionNotFoundException(sessionId);
        }
        return load(session.getThumbnailStorageKey(), session.getThumbnailContentType());
    }

    @Transactional
    public void delete(UUID sessionId, UUID candidateId) {
        MockInterviewSession session = findOwned(sessionId, candidateId);
        try {
            fileStorageService.delete(session.getVideoStorageKey());
            if (session.getThumbnailStorageKey() != null) {
                fileStorageService.delete(session.getThumbnailStorageKey());
            }
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to delete mock interview files", ex);
        }
        mockInterviewSessionRepository.delete(session);
    }

    private MockInterviewSession findOwned(UUID sessionId, UUID candidateId) {
        return mockInterviewSessionRepository
                .findById(sessionId)
                .filter(s -> s.getCandidateId().equals(candidateId))
                .orElseThrow(() -> new MockInterviewSessionNotFoundException(sessionId));
    }

    private String store(MultipartFile file, String subdirectory) {
        try {
            return fileStorageService.store(file, subdirectory);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store mock interview file", ex);
        }
    }

    private LoadedFile load(String storageKey, String contentType) {
        try {
            return new LoadedFile(fileStorageService.load(storageKey), contentType);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load mock interview file", ex);
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
                session.getQuestionCount(),
                session.getDurationSeconds(),
                session.getThumbnailStorageKey() != null,
                session.getRecordedAt());
    }

    public record LoadedFile(Resource resource, String contentType) {}
}
