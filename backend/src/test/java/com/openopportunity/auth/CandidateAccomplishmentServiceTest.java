package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.AddResearchPaperRequest;
import com.openopportunity.auth.dto.AddWorkSampleRequest;
import com.openopportunity.auth.dto.CandidateCertificationSummary;
import com.openopportunity.auth.dto.CandidateWorkSampleSummary;
import com.openopportunity.auth.exception.CandidateAccomplishmentLimitReachedException;
import com.openopportunity.auth.exception.CandidateAccomplishmentNotFoundException;
import com.openopportunity.auth.exception.CandidateCertificationLogoNotFoundException;
import com.openopportunity.auth.exception.InvalidCandidateCertificationLogoException;
import com.openopportunity.storage.FileStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CandidateAccomplishmentServiceTest {

    @Mock
    private CandidateWorkSampleRepository workSampleRepository;

    @Mock
    private CandidateResearchPaperRepository researchPaperRepository;

    @Mock
    private CandidateCertificationRepository certificationRepository;

    @Mock
    private FileStorageService fileStorageService;

    private CandidateAccomplishmentService service() {
        return new CandidateAccomplishmentService(
                workSampleRepository, researchPaperRepository, certificationRepository, fileStorageService);
    }

    @Test
    void addWorkSamplePersistsAndReturnsSummary() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        AddWorkSampleRequest request =
                new AddWorkSampleRequest("Portfolio site", "https://example.com/portfolio", "A personal site");

        CandidateWorkSampleSummary summary = service.addWorkSample(candidateId, request);

        assertThat(summary.title()).isEqualTo("Portfolio site");
        assertThat(summary.url()).isEqualTo("https://example.com/portfolio");
        assertThat(summary.description()).isEqualTo("A personal site");
        verify(workSampleRepository).save(any(CandidateWorkSample.class));
    }

    @Test
    void addWorkSampleRejectsOnceTheLimitIsReached() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        when(workSampleRepository.countByCandidateId(candidateId))
                .thenReturn((long) CandidateAccomplishmentService.MAX_WORK_SAMPLES);

        assertThatThrownBy(() -> service.addWorkSample(
                        candidateId, new AddWorkSampleRequest("Title", "https://example.com", null)))
                .isInstanceOf(CandidateAccomplishmentLimitReachedException.class);
        verify(workSampleRepository, never()).save(any());
    }

    @Test
    void deleteWorkSampleRejectsWhenNotOwnedByTheCaller() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        UUID workSampleId = UUID.randomUUID();
        when(workSampleRepository.findByIdAndCandidateId(workSampleId, candidateId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteWorkSample(candidateId, workSampleId))
                .isInstanceOf(CandidateAccomplishmentNotFoundException.class);
    }

    @Test
    void addResearchPaperRejectsOnceTheLimitIsReached() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        when(researchPaperRepository.countByCandidateId(candidateId))
                .thenReturn((long) CandidateAccomplishmentService.MAX_RESEARCH_PAPERS);

        assertThatThrownBy(() -> service.addResearchPaper(
                        candidateId, new AddResearchPaperRequest("Title", "https://example.com", null)))
                .isInstanceOf(CandidateAccomplishmentLimitReachedException.class);
        verify(researchPaperRepository, never()).save(any());
    }

    @Test
    void addCertificationWithoutALogoLeavesLogoUrlNull() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();

        CandidateCertificationSummary summary =
                service.addCertification(candidateId, "AWS Certified", "AWS-123", "https://aws.example.com", null);

        assertThat(summary.name()).isEqualTo("AWS Certified");
        assertThat(summary.certificationId()).isEqualTo("AWS-123");
        assertThat(summary.logoUrl()).isNull();
        verify(certificationRepository).save(any(CandidateCertification.class));
    }

    @Test
    void addCertificationStoresAResizedLogoRatherThanTheRawUpload() throws IOException {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        when(fileStorageService.store(any(byte[].class), anyString(), eq("certification-logos/" + candidateId)))
                .thenReturn("certification-logos/" + candidateId + "/resized.jpg");

        BufferedImage original = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream originalBytes = new ByteArrayOutputStream();
        ImageIO.write(original, "jpg", originalBytes);
        MockMultipartFile logo =
                new MockMultipartFile("logo", "logo.jpg", "image/jpeg", originalBytes.toByteArray());

        CandidateCertificationSummary summary =
                service.addCertification(candidateId, "AWS Certified", null, null, logo);

        ArgumentCaptor<byte[]> storedContent = ArgumentCaptor.forClass(byte[].class);
        verify(fileStorageService).store(storedContent.capture(), eq("logo.jpg"), eq("certification-logos/" + candidateId));
        assertThat(storedContent.getValue().length).isLessThan(originalBytes.size());
        assertThat(summary.logoUrl()).isNotNull();
    }

    @Test
    void addCertificationRejectsALogoWhoseBytesArentActuallyAnImage() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        MockMultipartFile logo =
                new MockMultipartFile("logo", "logo.jpg", "image/jpeg", "not actually an image".getBytes());

        assertThatThrownBy(() -> service.addCertification(candidateId, "AWS Certified", null, null, logo))
                .isInstanceOf(InvalidCandidateCertificationLogoException.class);
        verify(certificationRepository, never()).save(any());
    }

    @Test
    void deleteCertificationDeletesTheStoredLogoFile() throws IOException {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        CandidateCertification certification = new CandidateCertification(
                candidateId, "AWS Certified", "AWS-123", "https://aws.example.com", "logo-key-1", "image/png");
        when(certificationRepository.findByIdAndCandidateId(certification.getId(), candidateId))
                .thenReturn(Optional.of(certification));

        service.deleteCertification(candidateId, certification.getId());

        verify(fileStorageService).delete("logo-key-1");
        verify(certificationRepository).delete(certification);
    }

    @Test
    void getCertificationLogoRejectsACertificationWithNoLogoUploaded() {
        CandidateAccomplishmentService service = service();
        UUID candidateId = UUID.randomUUID();
        CandidateCertification certification =
                new CandidateCertification(candidateId, "AWS Certified", null, null, null, null);
        when(certificationRepository.findByIdAndCandidateId(certification.getId(), candidateId))
                .thenReturn(Optional.of(certification));

        assertThatThrownBy(() -> service.getCertificationLogo(candidateId, certification.getId()))
                .isInstanceOf(CandidateCertificationLogoNotFoundException.class);
    }
}
