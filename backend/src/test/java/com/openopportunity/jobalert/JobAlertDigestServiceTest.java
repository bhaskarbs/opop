package com.openopportunity.jobalert;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.mail.EmailService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;

@ExtendWith(MockitoExtension.class)
class JobAlertDigestServiceTest {

    @Mock
    private JobAlertRepository jobAlertRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JobService jobService;

    @Mock
    private EmailService emailService;

    private JobAlertDigestService digestService;

    @BeforeEach
    void setUp() {
        digestService = new JobAlertDigestService(
                jobAlertRepository, userRepository, jobService, emailService, "http://localhost:5173");
    }

    private static JobSummary aMatch() {
        return new JobSummary(
                UUID.randomUUID(),
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
                0,
                Instant.now(),
                null,
                false,
                false);
    }

    @Test
    void sendsADigestEmailWhenThereAreMatches() {
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("React"), List.of(), null, null);
        User candidate = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of(aMatch()));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        digestService.sendDailyDigests();

        verify(emailService).send(eq("rohan@example.com"), anyString(), anyString(), anyList(), any());
        verify(jobAlertRepository).save(alert);
    }

    @Test
    void doesNotEmailWhenThereAreNoMatchesButStillAdvancesLastNotifiedAt() {
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("Rust"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of());

        digestService.sendDailyDigests();

        verify(emailService, never()).send(any(), any(), any(), anyList(), any());
        ArgumentCaptor<JobAlert> captor = ArgumentCaptor.forClass(JobAlert.class);
        verify(jobAlertRepository).save(captor.capture());
        assertThatCode(() -> captor.getValue().getLastNotifiedAt()).doesNotThrowAnyException();
    }

    @Test
    void skipsAnAlertWhoseCandidateNoLongerExists() {
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("React"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of(aMatch()));
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());

        digestService.sendDailyDigests();

        verify(emailService, never()).send(any(), any(), any(), anyList(), any());
    }

    @Test
    void aFailedSendForOneAlertDoesNotStopTheSweep() {
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        JobAlert failing = new JobAlert(candidateId1, List.of("React"), List.of(), null, null);
        JobAlert succeeding = new JobAlert(candidateId2, List.of("React"), List.of(), null, null);
        User candidate1 = new User("fails@example.com", "hash", "Fails", UserRole.CANDIDATE);
        User candidate2 = new User("succeeds@example.com", "hash", "Succeeds", UserRole.CANDIDATE);
        when(jobAlertRepository.findAll()).thenReturn(List.of(failing, succeeding));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of(aMatch()));
        when(userRepository.findById(candidateId1)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(candidateId2)).thenReturn(Optional.of(candidate2));
        doThrow(new MailSendException("smtp down"))
                .when(emailService)
                .send(eq("fails@example.com"), anyString(), anyString(), anyList(), any());

        assertThatCode(() -> digestService.sendDailyDigests()).doesNotThrowAnyException();

        verify(emailService).send(eq("succeeds@example.com"), anyString(), anyString(), anyList(), any());
        verify(jobAlertRepository, times(2)).save(any());
    }
}
