package com.openopportunity.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private UserRepository userRepository;

    private JobService jobService;

    @BeforeEach
    void setUp() {
        jobService = new JobService(jobRepository, userRepository);
    }

    private JobRequest sampleRequest(JobStatus status) {
        return new JobRequest(
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                BigDecimal.valueOf(18),
                BigDecimal.valueOf(24),
                null,
                "Lead the dashboard rebuild.",
                List.of("Own delivery", "Mentor engineers"),
                List.of("5+ years React"),
                List.of("React", "TypeScript"),
                status);
    }

    @Test
    void createLooksUpCompanyNameAndStartsWithZeroApplicants() {
        UUID companyId = UUID.randomUUID();
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));

        JobDetail detail = jobService.create(companyId, sampleRequest(JobStatus.ACTIVE));

        assertThat(detail.companyName()).isEqualTo("Vertex Robotics");
        assertThat(detail.applicantCount()).isZero();
        assertThat(detail.status()).isEqualTo(JobStatus.ACTIVE);
    }

    @Test
    void updateRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = new Job(
                ownerId,
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.update(job.getId(), otherCompanyId, sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void updateRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.update(UUID.randomUUID(), UUID.randomUUID(), sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void deleteRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = new Job(
                ownerId,
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.delete(job.getId(), otherCompanyId))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void getActiveDetailRejectsDraftJob() {
        Job draft = new Job(
                UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.DRAFT);
        when(jobRepository.findById(draft.getId())).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> jobService.getActiveDetail(draft.getId()))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void getActiveDetailRejectsMissingJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.getActiveDetail(UUID.randomUUID()))
                .isInstanceOf(JobNotFoundException.class);
    }
}
