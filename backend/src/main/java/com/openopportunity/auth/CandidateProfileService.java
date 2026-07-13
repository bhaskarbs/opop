package com.openopportunity.auth;

import com.openopportunity.auth.exception.CandidateProfileNotFoundException;
import com.openopportunity.auth.exception.InvalidResumeFileException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CandidateProfileService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".pdf", ".doc", ".docx");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;

    private final CandidateProfileRepository candidateProfileRepository;
    private final FileStorageService fileStorageService;

    public CandidateProfileService(
            CandidateProfileRepository candidateProfileRepository, FileStorageService fileStorageService) {
        this.candidateProfileRepository = candidateProfileRepository;
        this.fileStorageService = fileStorageService;
    }

    /** Returns the resume's display filename once it's stored and the profile updated. */
    @Transactional
    public String uploadResume(UUID userId, MultipartFile file) {
        validate(file);
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new CandidateProfileNotFoundException(userId));

        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "resumes/" + userId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store resume", ex);
        }

        profile.updateResume(file.getOriginalFilename(), storageKey);
        candidateProfileRepository.save(profile);
        return profile.getResumeFileName();
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidResumeFileException("Resume file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidResumeFileException("Resume file must be 5MB or smaller");
        }
        String filename = file.getOriginalFilename();
        boolean allowedExtension = filename != null
                && ALLOWED_EXTENSIONS.stream().anyMatch(ext -> filename.toLowerCase().endsWith(ext));
        if (!allowedExtension) {
            throw new InvalidResumeFileException("Resume must be a PDF or Word document (.pdf, .doc, .docx)");
        }
    }
}
