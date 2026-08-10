package com.openopportunity.auth;

import com.openopportunity.auth.dto.AddResearchPaperRequest;
import com.openopportunity.auth.dto.AddWorkSampleRequest;
import com.openopportunity.auth.dto.CandidateCertificationSummary;
import com.openopportunity.auth.dto.CandidateResearchPaperSummary;
import com.openopportunity.auth.dto.CandidateWorkSampleSummary;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate")
public class CandidateAccomplishmentController {

    private final CandidateAccomplishmentService candidateAccomplishmentService;

    public CandidateAccomplishmentController(CandidateAccomplishmentService candidateAccomplishmentService) {
        this.candidateAccomplishmentService = candidateAccomplishmentService;
    }

    @GetMapping("/work-samples")
    public ResponseEntity<List<CandidateWorkSampleSummary>> listWorkSamples() {
        return ResponseEntity.ok(candidateAccomplishmentService.listWorkSamples(currentUserId()));
    }

    @PostMapping("/work-samples")
    public ResponseEntity<CandidateWorkSampleSummary> addWorkSample(
            @Valid @RequestBody AddWorkSampleRequest request) {
        return ResponseEntity.ok(candidateAccomplishmentService.addWorkSample(currentUserId(), request));
    }

    @DeleteMapping("/work-samples/{id}")
    public ResponseEntity<Void> deleteWorkSample(@PathVariable UUID id) {
        candidateAccomplishmentService.deleteWorkSample(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/research-papers")
    public ResponseEntity<List<CandidateResearchPaperSummary>> listResearchPapers() {
        return ResponseEntity.ok(candidateAccomplishmentService.listResearchPapers(currentUserId()));
    }

    @PostMapping("/research-papers")
    public ResponseEntity<CandidateResearchPaperSummary> addResearchPaper(
            @Valid @RequestBody AddResearchPaperRequest request) {
        return ResponseEntity.ok(candidateAccomplishmentService.addResearchPaper(currentUserId(), request));
    }

    @DeleteMapping("/research-papers/{id}")
    public ResponseEntity<Void> deleteResearchPaper(@PathVariable UUID id) {
        candidateAccomplishmentService.deleteResearchPaper(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/certifications")
    public ResponseEntity<List<CandidateCertificationSummary>> listCertifications() {
        return ResponseEntity.ok(candidateAccomplishmentService.listCertifications(currentUserId()));
    }

    @PostMapping("/certifications")
    public ResponseEntity<CandidateCertificationSummary> addCertification(
            @RequestParam("name") String name,
            @RequestParam(value = "certificationId", required = false) String certificationId,
            @RequestParam(value = "certificationUrl", required = false) String certificationUrl,
            @RequestParam(value = "logo", required = false) MultipartFile logo) {
        return ResponseEntity.ok(candidateAccomplishmentService.addCertification(
                currentUserId(), name, certificationId, certificationUrl, logo));
    }

    @DeleteMapping("/certifications/{id}")
    public ResponseEntity<Void> deleteCertification(@PathVariable UUID id) {
        candidateAccomplishmentService.deleteCertification(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
