package com.openopportunity.jobalert;

import com.openopportunity.jobalert.dto.JobAlertRequest;
import com.openopportunity.jobalert.dto.JobAlertSummary;
import com.openopportunity.jobalert.exception.JobAlertLimitReachedException;
import com.openopportunity.jobalert.exception.JobAlertNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobAlertService {

    // Same flat-cap approach as JobService.MAX_JOB_POSTINGS_PER_COMPANY — keeps the nightly
    // digest sweep (JobAlertDigestService) bounded per candidate.
    private static final long MAX_ALERTS_PER_CANDIDATE = 10;

    private final JobAlertRepository jobAlertRepository;

    public JobAlertService(JobAlertRepository jobAlertRepository) {
        this.jobAlertRepository = jobAlertRepository;
    }

    @Transactional(readOnly = true)
    public List<JobAlertSummary> getMine(UUID candidateId) {
        return jobAlertRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public JobAlertSummary create(UUID candidateId, JobAlertRequest request) {
        if (jobAlertRepository.countByCandidateId(candidateId) >= MAX_ALERTS_PER_CANDIDATE) {
            throw new JobAlertLimitReachedException();
        }
        JobAlert alert = new JobAlert(
                candidateId,
                nonNull(request.keywords()),
                nonNull(request.locations()),
                request.experienceLevel(),
                request.workMode());
        jobAlertRepository.save(alert);
        return toSummary(alert);
    }

    @Transactional
    public void delete(UUID id, UUID candidateId) {
        JobAlert alert = jobAlertRepository
                .findByIdAndCandidateId(id, candidateId)
                .orElseThrow(() -> new JobAlertNotFoundException(id));
        jobAlertRepository.delete(alert);
    }

    private static List<String> nonNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    private JobAlertSummary toSummary(JobAlert alert) {
        return new JobAlertSummary(
                alert.getId(),
                alert.getKeywords(),
                alert.getLocations(),
                alert.getExperienceLevel(),
                alert.getWorkMode(),
                alert.getCreatedAt());
    }
}
