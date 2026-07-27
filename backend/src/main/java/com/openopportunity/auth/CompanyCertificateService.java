package com.openopportunity.auth;

import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.dto.CompanyCertificateSummary;
import com.openopportunity.auth.exception.CompanyCertificateLimitReachedException;
import com.openopportunity.auth.exception.CompanyCertificateNotFoundException;
import com.openopportunity.auth.exception.InvalidCompanyCertificateException;
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

/** Verification documents (certificate of incorporation, etc.) a company has on file — shared
 * by both CompanyRegisterPage's upload and CompanyProfilePage's, which both call {@link
 * #upload}. A company may have up to {@value #MAX_CERTIFICATES} on file at once. */
@Service
public class CompanyCertificateService {

    public static final int MAX_CERTIFICATES = 5;

    private static final List<String> ALLOWED_CONTENT_TYPES =
            List.of("application/pdf", "image/jpeg", "image/png");
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    private final CompanyCertificateRepository certificateRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final FileStorageService fileStorageService;

    public CompanyCertificateService(
            CompanyCertificateRepository certificateRepository,
            CompanyProfileRepository companyProfileRepository,
            FileStorageService fileStorageService) {
        this.certificateRepository = certificateRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<CompanyCertificateSummary> list(UUID companyId) {
        return certificateRepository.findByCompanyIdOrderByUploadedAtDesc(companyId).stream()
                .map(CompanyCertificateService::toSummary)
                .toList();
    }

    @Transactional
    public CompanyCertificateSummary upload(UUID companyId, MultipartFile file) {
        validate(file);
        if (certificateRepository.countByCompanyId(companyId) >= MAX_CERTIFICATES) {
            throw new CompanyCertificateLimitReachedException();
        }

        String storageKey;
        try {
            storageKey = fileStorageService.store(file, "certificates/" + companyId);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store company certificate", ex);
        }

        CompanyCertificate certificate = new CompanyCertificate(
                companyId, storageKey, file.getContentType(), file.getOriginalFilename(), file.getSize());
        certificateRepository.save(certificate);
        requestReviewIfProfileExists(companyId);
        return toSummary(certificate);
    }

    /** Authenticated download of one of the company's own certificates — never served
     * publicly, since these are private verification documents. */
    @Transactional(readOnly = true)
    public CompanyCertificateContent download(UUID companyId, UUID certificateId) {
        CompanyCertificate certificate = certificateRepository
                .findByIdAndCompanyId(certificateId, companyId)
                .orElseThrow(() -> new CompanyCertificateNotFoundException(certificateId));
        try {
            Resource resource = fileStorageService.load(certificate.getStorageKey());
            return new CompanyCertificateContent(resource, certificate.getContentType(), certificate.getFileName());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load company certificate", ex);
        }
    }

    @Transactional
    public void delete(UUID companyId, UUID certificateId) {
        CompanyCertificate certificate = certificateRepository
                .findByIdAndCompanyId(certificateId, companyId)
                .orElseThrow(() -> new CompanyCertificateNotFoundException(certificateId));
        try {
            fileStorageService.delete(certificate.getStorageKey());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to delete company certificate", ex);
        }
        certificateRepository.delete(certificate);
        requestReviewIfProfileExists(companyId);
    }

    public record CompanyCertificateContent(Resource resource, String contentType, String fileName) {}

    // Registration uploads a certificate before CompanyProfile necessarily has every other
    // field filled in, but the profile row itself always exists by then (created in the same
    // AuthService.register transaction) — this only guards against a genuinely missing profile.
    private void requestReviewIfProfileExists(UUID companyId) {
        CompanyProfile profile = companyProfileRepository
                .findByUserId(companyId)
                .orElseThrow(() -> new CompanyProfileNotFoundException(companyId));
        profile.requestReview();
        companyProfileRepository.save(profile);
    }

    private static CompanyCertificateSummary toSummary(CompanyCertificate certificate) {
        return new CompanyCertificateSummary(
                certificate.getId(), certificate.getFileName(), certificate.getUploadedAt(), certificate.getSizeBytes());
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidCompanyCertificateException("Certificate file is empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidCompanyCertificateException("Certificate must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidCompanyCertificateException("Certificate must be a PDF, JPEG, or PNG file");
        }
    }
}
