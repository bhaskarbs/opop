package com.openopportunity.savedjob;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.JobNotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SavedJobServiceTest {

    @Mock
    private SavedJobRepository savedJobRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private JobService jobService;

    private SavedJobService savedJobService;

    @BeforeEach
    void setUp() {
        savedJobService = new SavedJobService(savedJobRepository, jobRepository, jobService);
    }

    private static JobSummary summary(UUID jobId) {
        return new JobSummary(
                jobId,
                "Senior Frontend Developer",
                "Vertex Robotics",
                "Bengaluru",
                WorkMode.HYBRID,
                ExperienceLevel.SENIOR,
                EmploymentType.FULL_TIME,
                BigDecimal.valueOf(18),
                BigDecimal.valueOf(24),
                List.of("React"),
                JobStatus.ACTIVE,
                3,
                Instant.now(),
                null,
                false,
                false);
    }

    @Test
    void saveIsANoOpWhenAlreadySaved() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(savedJobRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(true);

        savedJobService.save(candidateId, jobId);

        verify(jobRepository, never()).existsById(any());
        verify(savedJobRepository, never()).save(any());
    }

    @Test
    void saveRejectsAJobThatDoesNotExist() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(savedJobRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
        when(jobRepository.existsById(jobId)).thenReturn(false);

        assertThatThrownBy(() -> savedJobService.save(candidateId, jobId)).isInstanceOf(JobNotFoundException.class);

        verify(savedJobRepository, never()).save(any());
    }

    @Test
    void saveCreatesABookmarkForAnExistingJob() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(savedJobRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
        when(jobRepository.existsById(jobId)).thenReturn(true);

        savedJobService.save(candidateId, jobId);

        verify(savedJobRepository).save(any(SavedJob.class));
    }

    @Test
    void unsaveDelegatesStraightToTheRepository() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        savedJobService.unsave(candidateId, jobId);

        verify(savedJobRepository).deleteByCandidateIdAndJobId(candidateId, jobId);
    }

    @Test
    void getMineReturnsSummariesInSavedOrderAndDropsJobsThatNoLongerExist() {
        UUID candidateId = UUID.randomUUID();
        UUID keptJobId = UUID.randomUUID();
        UUID deletedJobId = UUID.randomUUID();
        // Most-recently-saved first: deletedJobId was saved after keptJobId, but its Job row is
        // gone by the time getMine() runs.
        SavedJob savedDeleted = new SavedJob(candidateId, deletedJobId);
        SavedJob savedKept = new SavedJob(candidateId, keptJobId);
        when(savedJobRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId))
                .thenReturn(List.of(savedDeleted, savedKept));
        when(jobService.getByIds(List.of(deletedJobId, keptJobId))).thenReturn(List.of(summary(keptJobId)));

        List<JobSummary> result = savedJobService.getMine(candidateId);

        assertThat(result).extracting(JobSummary::id).containsExactly(keptJobId);
    }
}
