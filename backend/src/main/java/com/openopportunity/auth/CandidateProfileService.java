package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateProfileResponse;
import com.openopportunity.auth.dto.PhotoUploadResponse;
import com.openopportunity.auth.dto.ResumeUploadResponse;
import com.openopportunity.auth.dto.UpdateGoalsRequest;
import com.openopportunity.auth.dto.UpdateMobileRequest;
import com.openopportunity.auth.dto.UpdatePersonalDetailsRequest;
import com.openopportunity.auth.dto.UpdatePreferencesRequest;
import com.openopportunity.auth.dto.UpdateSkillsRequest;
import com.openopportunity.auth.exception.InvalidProfilePhotoException;
import com.openopportunity.auth.exception.InvalidResumeFileException;
import com.openopportunity.auth.exception.ProfilePhotoNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CandidateProfileService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".pdf", ".doc", ".docx");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final List<String> ALLOWED_PHOTO_CONTENT_TYPES =
            List.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_PHOTO_SIZE_BYTES = 5L * 1024 * 1024;

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final FileStorageService fileStorageService;

    public CandidateProfileService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public CandidateProfileResponse getProfile(UUID userId) {
        return toResponse(userRepository.findById(userId).orElseThrow(), findProfile(userId));
    }

    @Transactional
    public CandidateProfileResponse updatePersonalDetails(UUID userId, UpdatePersonalDetailsRequest request) {
        User user = userRepository.findById(userId).orElseThrow();
        user.updateFullName(request.fullName());
        userRepository.save(user);

        CandidateProfile profile = findProfile(userId);
        profile.updatePersonalDetails(
                request.location(), request.title(), request.mobile(), request.experienceLevel(), request.industry());
        candidateProfileRepository.save(profile);
        return toResponse(user, profile);
    }

    @Transactional
    public CandidateProfileResponse updateSkills(UUID userId, UpdateSkillsRequest request) {
        CandidateProfile profile = findProfile(userId);
        profile.updateSkills(request.skills());
        candidateProfileRepository.save(profile);
        return toResponse(userRepository.findById(userId).orElseThrow(), profile);
    }

    @Transactional
    public CandidateProfileResponse updateGoals(UUID userId, UpdateGoalsRequest request) {
        CandidateProfile profile = findProfile(userId);
        profile.updateGoals(request.lifeGoals(), request.workCulture());
        candidateProfileRepository.save(profile);
        return toResponse(userRepository.findById(userId).orElseThrow(), profile);
    }

    @Transactional
    public CandidateProfileResponse updateMobile(UUID userId, UpdateMobileRequest request) {
        CandidateProfile profile = findProfile(userId);
        profile.verifyMobile(request.mobile());
        candidateProfileRepository.save(profile);
        return toResponse(userRepository.findById(userId).orElseThrow(), profile);
    }

    @Transactional
    public CandidateProfileResponse updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        CandidateProfile profile = findProfile(userId);
        profile.updatePreferences(request.workMode(), request.openTo());
        candidateProfileRepository.save(profile);
        return toResponse(userRepository.findById(userId).orElseThrow(), profile);
    }

    @Transactional
    public ResumeUploadResponse uploadResume(UUID userId, MultipartFile file) {
        validate(file);
        CandidateProfile profile = findProfile(userId);

        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "resumes/" + userId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store resume", ex);
        }

        Instant uploadedAt = Instant.now();
        profile.updateResume(file.getOriginalFilename(), storageKey, file.getSize(), uploadedAt);
        candidateProfileRepository.save(profile);
        return new ResumeUploadResponse(profile.getResumeFileName(), uploadedAt, file.getSize());
    }

    @Transactional
    public PhotoUploadResponse uploadPhoto(UUID userId, MultipartFile file) {
        validatePhoto(file);
        CandidateProfile profile = findProfile(userId);

        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "photos/" + userId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store profile photo", ex);
        }

        profile.updatePhoto(storageKey, file.getContentType());
        candidateProfileRepository.save(profile);
        return new PhotoUploadResponse(photoUrl(userId));
    }

    /** Public (unauthenticated) lookup — see CandidatePhotoController, which serves this
     * straight to an &lt;img&gt; tag with no bearer token attached. */
    @Transactional(readOnly = true)
    public CandidatePhotoContent getPhoto(UUID userId) {
        CandidateProfile profile = candidateProfileRepository
                .findByUserId(userId)
                .filter(existing -> existing.getPhotoStorageKey() != null)
                .orElseThrow(() -> new ProfilePhotoNotFoundException(userId));
        try {
            Resource resource = fileStorageService.load(profile.getPhotoStorageKey());
            return new CandidatePhotoContent(resource, profile.getPhotoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load profile photo", ex);
        }
    }

    public record CandidatePhotoContent(Resource resource, String contentType) {}

    // Auto-provisions a blank profile for accounts registered before candidate_profiles
    // existed (or any other legacy gap) rather than 404ing — every candidate ends up with a
    // row on first touch, which they then fill in via the usual update endpoints.
    private CandidateProfile findProfile(UUID userId) {
        return candidateProfileRepository
                .findByUserId(userId)
                .orElseGet(() -> candidateProfileRepository.save(new CandidateProfile(userId, "", List.of(), null)));
    }

    private CandidateProfileResponse toResponse(User user, CandidateProfile profile) {
        return new CandidateProfileResponse(
                user.getFullName(),
                user.getEmail(),
                profile.getMobile(),
                profile.isMobileVerified(),
                profile.getLocation(),
                profile.getTitle(),
                profile.getExperienceLevel(),
                profile.getIndustry(),
                profile.getSkills(),
                profile.getResumeFileName(),
                profile.getResumeUploadedAt(),
                profile.getResumeSizeBytes(),
                profile.getPhotoStorageKey() == null ? null : photoUrl(profile.getUserId()),
                profile.getLifeGoals(),
                profile.getWorkCulture(),
                profile.getWorkModePreference(),
                profile.getOpenToPreference(),
                user.getCreatedAt());
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

    private void validatePhoto(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidProfilePhotoException("Photo file is empty");
        }
        if (file.getSize() > MAX_PHOTO_SIZE_BYTES) {
            throw new InvalidProfilePhotoException("Photo must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_PHOTO_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidProfilePhotoException("Photo must be a JPEG, PNG, or WEBP image");
        }
    }

    private String photoUrl(UUID userId) {
        return "/api/candidates/" + userId + "/photo";
    }
}
