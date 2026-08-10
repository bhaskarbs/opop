package com.openopportunity.auth;

import com.openopportunity.auth.dto.AddResearchPaperRequest;
import com.openopportunity.auth.dto.AddWorkSampleRequest;
import com.openopportunity.auth.dto.CandidateCertificationSummary;
import com.openopportunity.auth.dto.CandidateResearchPaperSummary;
import com.openopportunity.auth.dto.CandidateWorkSampleSummary;
import com.openopportunity.auth.exception.CandidateAccomplishmentLimitReachedException;
import com.openopportunity.auth.exception.CandidateAccomplishmentNotFoundException;
import com.openopportunity.auth.exception.CandidateCertificationLogoNotFoundException;
import com.openopportunity.auth.exception.InvalidCandidateCertificationLogoException;
import com.openopportunity.storage.AvatarImageResizer;
import com.openopportunity.storage.FileStorageService;
import com.openopportunity.storage.ImageContentValidator;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Three repeatable, candidate-owned "accomplishment" lists shown on CandidateProfilePage/
 * AddMissingDetailsPage — work samples, research papers, and certifications. Grouped into one
 * service since all three share the same list/add/delete shape (see CompanyCertificateService
 * for the precedent this mirrors); certifications additionally carry an optional logo image. */
@Service
public class CandidateAccomplishmentService {

    public static final int MAX_WORK_SAMPLES = 10;
    public static final int MAX_RESEARCH_PAPERS = 10;
    public static final int MAX_CERTIFICATIONS = 10;

    private static final long MAX_LOGO_SIZE_BYTES = 5L * 1024 * 1024;

    private final CandidateWorkSampleRepository workSampleRepository;
    private final CandidateResearchPaperRepository researchPaperRepository;
    private final CandidateCertificationRepository certificationRepository;
    private final FileStorageService fileStorageService;

    public CandidateAccomplishmentService(
            CandidateWorkSampleRepository workSampleRepository,
            CandidateResearchPaperRepository researchPaperRepository,
            CandidateCertificationRepository certificationRepository,
            FileStorageService fileStorageService) {
        this.workSampleRepository = workSampleRepository;
        this.researchPaperRepository = researchPaperRepository;
        this.certificationRepository = certificationRepository;
        this.fileStorageService = fileStorageService;
    }

    // ---- Work samples ----

    @Transactional(readOnly = true)
    public List<CandidateWorkSampleSummary> listWorkSamples(UUID candidateId) {
        return workSampleRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(CandidateAccomplishmentService::toSummary)
                .toList();
    }

    @Transactional
    public CandidateWorkSampleSummary addWorkSample(UUID candidateId, AddWorkSampleRequest request) {
        if (workSampleRepository.countByCandidateId(candidateId) >= MAX_WORK_SAMPLES) {
            throw new CandidateAccomplishmentLimitReachedException("work samples", MAX_WORK_SAMPLES);
        }
        CandidateWorkSample sample =
                new CandidateWorkSample(candidateId, request.title(), request.url(), request.description());
        workSampleRepository.save(sample);
        return toSummary(sample);
    }

    @Transactional
    public void deleteWorkSample(UUID candidateId, UUID workSampleId) {
        CandidateWorkSample sample = workSampleRepository
                .findByIdAndCandidateId(workSampleId, candidateId)
                .orElseThrow(() -> new CandidateAccomplishmentNotFoundException("Work sample", workSampleId));
        workSampleRepository.delete(sample);
    }

    // ---- Research papers ----

    @Transactional(readOnly = true)
    public List<CandidateResearchPaperSummary> listResearchPapers(UUID candidateId) {
        return researchPaperRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(CandidateAccomplishmentService::toSummary)
                .toList();
    }

    @Transactional
    public CandidateResearchPaperSummary addResearchPaper(UUID candidateId, AddResearchPaperRequest request) {
        if (researchPaperRepository.countByCandidateId(candidateId) >= MAX_RESEARCH_PAPERS) {
            throw new CandidateAccomplishmentLimitReachedException("research papers", MAX_RESEARCH_PAPERS);
        }
        CandidateResearchPaper paper =
                new CandidateResearchPaper(candidateId, request.title(), request.url(), request.description());
        researchPaperRepository.save(paper);
        return toSummary(paper);
    }

    @Transactional
    public void deleteResearchPaper(UUID candidateId, UUID researchPaperId) {
        CandidateResearchPaper paper = researchPaperRepository
                .findByIdAndCandidateId(researchPaperId, candidateId)
                .orElseThrow(() -> new CandidateAccomplishmentNotFoundException("Research paper", researchPaperId));
        researchPaperRepository.delete(paper);
    }

    // ---- Certifications ----

    @Transactional(readOnly = true)
    public List<CandidateCertificationSummary> listCertifications(UUID candidateId) {
        return certificationRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public CandidateCertificationSummary addCertification(
            UUID candidateId,
            String name,
            String certificationId,
            String certificationUrl,
            MultipartFile logo) {
        if (certificationRepository.countByCandidateId(candidateId) >= MAX_CERTIFICATIONS) {
            throw new CandidateAccomplishmentLimitReachedException("certifications", MAX_CERTIFICATIONS);
        }

        String logoStorageKey = null;
        String logoContentType = null;
        if (logo != null && !logo.isEmpty()) {
            byte[] bytes;
            try {
                bytes = logo.getBytes();
            } catch (IOException ex) {
                throw new UncheckedIOException("Failed to read certification logo upload", ex);
            }
            logoContentType = validateLogo(logo, bytes);
            try {
                byte[] resized = AvatarImageResizer.resize(bytes);
                logoStorageKey = fileStorageService.store(
                        resized, logo.getOriginalFilename(), "certification-logos/" + candidateId);
            } catch (IOException ex) {
                throw new UncheckedIOException("Failed to store certification logo", ex);
            }
        }

        CandidateCertification certification = new CandidateCertification(
                candidateId, name, certificationId, certificationUrl, logoStorageKey, logoContentType);
        certificationRepository.save(certification);
        return toSummary(certification);
    }

    @Transactional
    public void deleteCertification(UUID candidateId, UUID certificationId) {
        CandidateCertification certification = certificationRepository
                .findByIdAndCandidateId(certificationId, candidateId)
                .orElseThrow(() -> new CandidateAccomplishmentNotFoundException("Certification", certificationId));
        if (certification.getLogoStorageKey() != null) {
            try {
                fileStorageService.delete(certification.getLogoStorageKey());
            } catch (IOException ex) {
                throw new UncheckedIOException("Failed to delete certification logo", ex);
            }
        }
        certificationRepository.delete(certification);
    }

    /** Public (unauthenticated) lookup — see CandidateCertificationLogoController, which serves
     * this straight to an &lt;img&gt; tag with no bearer token attached, same pattern as
     * CandidateProfileService.getPhoto. */
    @Transactional(readOnly = true)
    public CertificationLogoContent getCertificationLogo(UUID candidateId, UUID certificationId) {
        CandidateCertification certification = certificationRepository
                .findByIdAndCandidateId(certificationId, candidateId)
                .filter(existing -> existing.getLogoStorageKey() != null)
                .orElseThrow(() -> new CandidateCertificationLogoNotFoundException(certificationId));
        try {
            Resource resource = fileStorageService.load(certification.getLogoStorageKey());
            return new CertificationLogoContent(resource, certification.getLogoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load certification logo", ex);
        }
    }

    public record CertificationLogoContent(Resource resource, String contentType) {}

    private static CandidateWorkSampleSummary toSummary(CandidateWorkSample sample) {
        return new CandidateWorkSampleSummary(
                sample.getId(), sample.getTitle(), sample.getUrl(), sample.getDescription(), sample.getCreatedAt());
    }

    private static CandidateResearchPaperSummary toSummary(CandidateResearchPaper paper) {
        return new CandidateResearchPaperSummary(
                paper.getId(), paper.getTitle(), paper.getUrl(), paper.getDescription(), paper.getCreatedAt());
    }

    private CandidateCertificationSummary toSummary(CandidateCertification certification) {
        return new CandidateCertificationSummary(
                certification.getId(),
                certification.getName(),
                certification.getCertificationId(),
                certification.getCertificationUrl(),
                certification.getLogoStorageKey() == null ? null : logoUrl(certification),
                certification.getCreatedAt());
    }

    private String logoUrl(CandidateCertification certification) {
        return "/api/candidates/" + certification.getCandidateId() + "/certifications/"
                + certification.getId() + "/logo";
    }

    private String validateLogo(MultipartFile file, byte[] bytes) {
        if (file.getSize() > MAX_LOGO_SIZE_BYTES) {
            throw new InvalidCandidateCertificationLogoException("Logo must be 5MB or smaller");
        }
        return ImageContentValidator.detectContentType(bytes)
                .orElseThrow(() ->
                        new InvalidCandidateCertificationLogoException("Logo must be a JPEG, PNG, or WEBP image"));
    }
}
