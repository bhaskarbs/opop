package com.openopportunity.auth;

import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.dto.CertificateUploadResponse;
import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.LogoUploadResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import com.openopportunity.auth.exception.CompanyCertificateNotFoundException;
import com.openopportunity.auth.exception.CompanyLogoNotFoundException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCompanyCertificateException;
import com.openopportunity.auth.exception.InvalidCompanyLogoException;
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

/** Self-service counterpart to AdminCompanyService — a company reading/updating its own
 * profile, as opposed to an admin reviewing/verifying someone else's. Company details are set
 * either at registration (see AuthService.register) or, for a Google-signup company that
 * started with a blank profile, via updateProfile below. */
@Service
public class CompanyProfileService {

    private static final List<String> ALLOWED_LOGO_CONTENT_TYPES =
            List.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_LOGO_SIZE_BYTES = 5L * 1024 * 1024;
    private static final List<String> ALLOWED_CERTIFICATE_CONTENT_TYPES =
            List.of("application/pdf", "image/jpeg", "image/png");
    private static final long MAX_CERTIFICATE_SIZE_BYTES = 5L * 1024 * 1024;

    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final FileStorageService fileStorageService;

    public CompanyProfileService(
            UserRepository userRepository,
            CompanyProfileRepository companyProfileRepository,
            FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.fileStorageService = fileStorageService;
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
            storageKey = fileStorageService.store(file, "logos/" + userId);
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

    @Transactional
    public CertificateUploadResponse uploadCertificate(UUID userId, MultipartFile file) {
        validateCertificate(file);
        CompanyProfile profile = findProfile(userId);

        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "certificates/" + userId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store company certificate", ex);
        }

        Instant uploadedAt = Instant.now();
        profile.updateCertificate(
                storageKey, file.getContentType(), file.getOriginalFilename(), file.getSize(), uploadedAt);
        companyProfileRepository.save(profile);
        return new CertificateUploadResponse(profile.getCertificateFileName(), uploadedAt, file.getSize());
    }

    /** Authenticated download of the company's own certificate — unlike getLogo, this is never
     * served publicly, since it's a private verification document. */
    @Transactional(readOnly = true)
    public CompanyCertificateContent getCertificate(UUID userId) {
        CompanyProfile profile = companyProfileRepository
                .findByUserId(userId)
                .filter(existing -> existing.getCertificateStorageKey() != null)
                .orElseThrow(() -> new CompanyCertificateNotFoundException(userId));
        try {
            Resource resource = fileStorageService.load(profile.getCertificateStorageKey());
            return new CompanyCertificateContent(
                    resource, profile.getCertificateContentType(), profile.getCertificateFileName());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load company certificate", ex);
        }
    }

    public record CompanyCertificateContent(Resource resource, String contentType, String fileName) {}

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
                profile.getLogoStorageKey() == null ? null : logoUrl(profile.getUserId()),
                profile.getCertificateFileName(),
                profile.getCertificateUploadedAt(),
                profile.getCertificateSizeBytes());
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

    private void validateCertificate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidCompanyCertificateException("Certificate file is empty");
        }
        if (file.getSize() > MAX_CERTIFICATE_SIZE_BYTES) {
            throw new InvalidCompanyCertificateException("Certificate must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null
                || !ALLOWED_CERTIFICATE_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidCompanyCertificateException("Certificate must be a PDF, JPEG, or PNG file");
        }
    }

    private String logoUrl(UUID userId) {
        return "/api/companies/" + userId + "/logo";
    }
}
