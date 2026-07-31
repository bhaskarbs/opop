package com.openopportunity.auth;

import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.LogoUploadResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import com.openopportunity.auth.exception.CompanyLogoNotFoundException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCompanyLogoException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import com.openopportunity.storage.AvatarImageResizer;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Self-service counterpart to AdminCompanyService — a company reading/updating its own
 * profile, as opposed to an admin reviewing/verifying someone else's. Company details are set
 * either at registration (see AuthService.register) or, for a Google-signup company that
 * started with a blank profile, via updateProfile below. Verification documents live in
 * CompanyCertificate/CompanyCertificateService, not here. */
@Service
public class CompanyProfileService {

    private static final List<String> ALLOWED_LOGO_CONTENT_TYPES =
            List.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_LOGO_SIZE_BYTES = 5L * 1024 * 1024;

    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;

    public CompanyProfileService(
            UserRepository userRepository,
            CompanyProfileRepository companyProfileRepository,
            FileStorageService fileStorageService,
            NotificationService notificationService) {
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public CompanyProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();
        CompanyProfile profile = findProfile(userId);
        return toResponse(user, profile);
    }

    @Transactional
    public CompanyProfileResponse updateProfile(UUID userId, UpdateCompanyProfileRequest request) {
        requireValidProfileFields(request);
        User user = userRepository.findById(userId).orElseThrow();
        user.updateFullName(request.companyName());
        CompanyProfile profile = findProfile(userId);
        profile.updateDetails(
                request.entityType(),
                request.cin(),
                request.gstin(),
                request.pan(),
                request.industry(),
                request.address(),
                request.signatoryName(),
                request.contactNumber(),
                request.aadhaarNumber());
        companyProfileRepository.save(profile);
        if (profile.isProfileComplete()) {
            notificationService.notifyAdmins(
                    NotificationType.COMPANY_PENDING_VERIFICATION,
                    "New company \"" + user.getFullName() + "\" is awaiting verification.",
                    "/admin/approvals/companies");
        }
        return toResponse(user, profile);
    }

    /** cin+gstin are required unless entityType is CompanyProfile.UNREGISTERED_ENTITY_TYPE, in
     * which case aadhaarNumber substitutes for them — mirrors AuthService's registration-time
     * check (see requireCompanyProfileFields), since a Google-signup company completes these
     * same fields here instead of at registration. */
    private void requireValidProfileFields(UpdateCompanyProfileRequest request) {
        if (CompanyProfile.UNREGISTERED_ENTITY_TYPE.equals(request.entityType())) {
            if (!isNotBlank(request.aadhaarNumber())) {
                throw new IncompleteCompanyProfileException(
                        "Enter your Aadhaar number since your company isn't registered yet");
            }
            return;
        }
        if (!isNotBlank(request.cin()) || !isNotBlank(request.gstin())) {
            throw new IncompleteCompanyProfileException("Enter your CIN/LLPIN and GSTIN");
        }
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    @Transactional
    public LogoUploadResponse uploadLogo(UUID userId, MultipartFile file) {
        validateLogo(file);
        CompanyProfile profile = findProfile(userId);

        String storageKey;
        try {
            byte[] resized = AvatarImageResizer.resize(file.getBytes());
            storageKey = fileStorageService.store(resized, file.getOriginalFilename(), "logos/" + userId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store company logo", ex);
        }

        profile.updateLogo(storageKey, file.getContentType());
        companyProfileRepository.save(profile);
        return new LogoUploadResponse(logoUrl(userId));
    }

    /** Public (unauthenticated) lookup — see CompanyLogoController, which serves this straight
     * to an &lt;img&gt; tag with no bearer token attached, both in the company's own header and
     * on job listings candidates browse. */
    @Transactional(readOnly = true)
    public CompanyLogoContent getLogo(UUID userId) {
        CompanyProfile profile = companyProfileRepository
                .findByUserId(userId)
                .filter(existing -> existing.getLogoStorageKey() != null)
                .orElseThrow(() -> new CompanyLogoNotFoundException(userId));
        try {
            Resource resource = fileStorageService.load(profile.getLogoStorageKey());
            return new CompanyLogoContent(resource, profile.getLogoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load company logo", ex);
        }
    }

    public record CompanyLogoContent(Resource resource, String contentType) {}

    private CompanyProfile findProfile(UUID userId) {
        return companyProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new CompanyProfileNotFoundException(userId));
    }

    private CompanyProfileResponse toResponse(User user, CompanyProfile profile) {
        return new CompanyProfileResponse(
                user.getFullName(),
                user.getEmail(),
                profile.getEntityType(),
                profile.getCin(),
                profile.getGstin(),
                profile.getAadhaarNumber(),
                profile.getPan(),
                profile.getIndustry(),
                profile.getAddress(),
                profile.getSignatoryName(),
                profile.getContactNumber(),
                profile.getVerificationStatus(),
                profile.isProfileComplete(),
                profile.getLogoStorageKey() == null ? null : logoUrl(profile.getUserId()));
    }

    private void validateLogo(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidCompanyLogoException("Logo file is empty");
        }
        if (file.getSize() > MAX_LOGO_SIZE_BYTES) {
            throw new InvalidCompanyLogoException("Logo must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_LOGO_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidCompanyLogoException("Logo must be a JPEG, PNG, or WEBP image");
        }
    }

    private String logoUrl(UUID userId) {
        return "/api/companies/" + userId + "/logo";
    }
}
