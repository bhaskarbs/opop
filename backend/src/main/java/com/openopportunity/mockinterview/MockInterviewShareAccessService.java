package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.exception.MockInterviewShareLinkNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The public, unauthenticated side of a mock interview session's share link — everything
 * reachable from a share token alone, no login. See SecurityConfig's permitAll rule for
 * "/api/mock-interview-shares/**". Deliberately its own class, separate from MockInterviewService
 * (candidate-authenticated) — same isolation reasoning as SharedVideoAccessService vs
 * AdminVideoService: keeping every publicly-reachable method in one small class makes it easy to
 * audit that nothing owner-only (candidate identity, other sessions, etc.) ever leaks through
 * here. */
@Service
public class MockInterviewShareAccessService {

    private final MockInterviewSessionRepository sessionRepository;
    private final FileStorageService fileStorageService;

    public MockInterviewShareAccessService(
            MockInterviewSessionRepository sessionRepository, FileStorageService fileStorageService) {
        this.sessionRepository = sessionRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public LoadedSharedSession loadVideo(String token) {
        MockInterviewSession session = sessionRepository
                .findByShareToken(token)
                .orElseThrow(MockInterviewShareLinkNotFoundException::new);
        try {
            Resource resource = fileStorageService.load(session.getVideoStorageKey());
            return new LoadedSharedSession(resource, session.getVideoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load shared mock interview video", ex);
        }
    }

    public record LoadedSharedSession(Resource resource, String contentType) {}
}
