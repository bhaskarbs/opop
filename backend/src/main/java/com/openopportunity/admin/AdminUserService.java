package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateProfileSummary;
import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import com.openopportunity.auth.exception.CandidateResumeNotFoundException;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final FileStorageService fileStorageService;

    public AdminUserService(
            UserRepository userRepository,
            CompanyProfileRepository companyProfileRepository,
            CandidateProfileRepository candidateProfileRepository,
            FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.fileStorageService = fileStorageService;
    }

    /** "Basic user management" scope (small local dataset) — filters in memory rather than
     * building SQL Specifications like the Job Service's search does. */
    @Transactional(readOnly = true)
    public List<AdminUserSummary> list(UserRole role, AccountStatus status, String query) {
        String normalizedQuery = query == null ? null : query.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() != UserRole.ADMIN)
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> status == null || user.getAccountStatus() == status)
                .filter(user -> normalizedQuery == null
                        || normalizedQuery.isBlank()
                        || user.getFullName().toLowerCase().contains(normalizedQuery)
                        || user.getEmail().toLowerCase().contains(normalizedQuery))
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public AdminUserSummary suspend(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AdminUserNotFoundException(userId));
        user.suspend();
        userRepository.save(user);
        return toSummary(user);
    }

    @Transactional
    public AdminUserSummary reactivate(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AdminUserNotFoundException(userId));
        user.reactivate();
        userRepository.save(user);
        return toSummary(user);
    }

    /** Every CandidateProfile field comes back null when the candidate hasn't filled one in
     * yet — this reads whatever exists rather than auto-provisioning a blank row the way
     * CandidateProfileService.findProfile does, since this is a read-only admin view. */
    @Transactional(readOnly = true)
    public AdminCandidateProfileSummary getCandidateDetail(UUID userId) {
        User user = userRepository.findById(userId)
                .filter(candidate -> candidate.getRole() == UserRole.CANDIDATE)
                .orElseThrow(() -> new AdminUserNotFoundException(userId));
        CandidateProfile profile = candidateProfileRepository.findByUserId(userId).orElse(null);
        return new AdminCandidateProfileSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getAccountStatus(),
                profile == null ? null : profile.getMobile(),
                profile != null && profile.isMobileVerified(),
                profile == null ? null : profile.getLocation(),
                profile == null ? null : profile.getTitle(),
                profile == null ? null : profile.getExperienceLevel(),
                profile == null ? null : profile.getIndustry(),
                profile == null ? List.of() : profile.getSkills(),
                profile == null ? null : profile.getResumeFileName(),
                profile == null ? null : profile.getResumeUploadedAt(),
                profile == null ? null : profile.getResumeSizeBytes(),
                profile == null || profile.getPhotoStorageKey() == null
                        ? null
                        : "/api/candidates/" + userId + "/photo",
                profile == null ? null : profile.getLifeGoals(),
                profile == null ? null : profile.getWorkCulture(),
                profile == null ? null : profile.getWorkModePreference(),
                profile == null ? null : profile.getOpenToPreference(),
                user.getCreatedAt());
    }

    /** Unlike CandidateSearchService.getResume (a company's view), there's no "eligible to
     * contact" gate here — an admin can always pull a candidate's resume for moderation
     * purposes. */
    @Transactional(readOnly = true)
    public LoadedResume getCandidateResume(UUID userId) {
        userRepository.findById(userId)
                .filter(candidate -> candidate.getRole() == UserRole.CANDIDATE)
                .orElseThrow(() -> new AdminUserNotFoundException(userId));
        CandidateProfile profile = candidateProfileRepository.findByUserId(userId)
                .filter(existing -> existing.getResumeStorageKey() != null)
                .orElseThrow(() -> new CandidateResumeNotFoundException(userId));
        try {
            Resource resource = fileStorageService.load(profile.getResumeStorageKey());
            return new LoadedResume(
                    resource, profile.getResumeFileName(), contentTypeFor(profile.getResumeFileName()));
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load resume", ex);
        }
    }

    public record LoadedResume(Resource resource, String fileName, String contentType) {}

    private String contentTypeFor(String fileName) {
        String lower = fileName == null ? "" : fileName.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        if (lower.endsWith(".doc")) {
            return "application/msword";
        }
        return "application/octet-stream";
    }

    private AdminUserSummary toSummary(User user) {
        CompanyProfile companyProfile = user.getRole() == UserRole.COMPANY
                ? companyProfileRepository.findByUserId(user.getId()).orElse(null)
                : null;
        return new AdminUserSummary(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getAccountStatus(),
                companyProfile == null ? null : companyProfile.getVerificationStatus(),
                companyProfile == null ? null : companyProfile.getIndustry(),
                companyProfile == null ? null : companyProfile.getCin(),
                user.getCreatedAt());
    }
}
