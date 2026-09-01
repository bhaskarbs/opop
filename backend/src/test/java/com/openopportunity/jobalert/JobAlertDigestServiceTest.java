package com.openopportunity.jobalert;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
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

@ExtendWith(MockitoExtension.class)
class JobAlertDigestServiceTest {

    @Mock
    private JobAlertRepository jobAlertRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JobService jobService;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private JobAlertDigestService digestService;

    @BeforeEach
    void setUp() {
        digestService = new JobAlertDigestService(
                jobAlertRepository, userRepository, jobService, asyncEmailSender, "http://localhost:5173");
    }

    private static JobSummary aMatch() {
        return new JobSummary(
                UUID.randomUUID(),
                "Senior Frontend Developer",
                "Vertex Robotics",
                List.of("Bengaluru"),
                WorkMode.HYBRID,
                ExperienceLevel.SENIOR,
                EmploymentType.FULL_TIME,
                BigDecimal.valueOf(18),
                BigDecimal.valueOf(24),
                null,
                null,
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

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"),
                        anyString(),
                        anyString(),
                        anyList(),
                        any(EmailButton.class),
                        any(Runnable.class));
        verify(jobAlertRepository).save(alert);
    }

    @Test
    void doesNotEmailWhenThereAreNoMatchesButStillAdvancesLastNotifiedAt() {
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("Rust"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of());

        digestService.sendDailyDigests();

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
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

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }

    /** Actually swallowing a send failure without stopping the sweep is AsyncEmailSender's job
     * (see AsyncEmailSenderTest) — this class only needs to fire-and-forget to it for every
     * matching alert, which is what this asserts. */
    @Test
    void firesOffADigestForEveryMatchingAlertRegardlessOfHowTheOthersFare() {
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        JobAlert alert1 = new JobAlert(candidateId1, List.of("React"), List.of(), null, null);
        JobAlert alert2 = new JobAlert(candidateId2, List.of("React"), List.of(), null, null);
        User candidate1 = new User("first@example.com", "hash", "First", UserRole.CANDIDATE);
        User candidate2 = new User("second@example.com", "hash", "Second", UserRole.CANDIDATE);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert1, alert2));
        when(jobService.searchPostedAfter(any(), any(), any(), any(), any())).thenReturn(List.of(aMatch()));
        when(userRepository.findById(candidateId1)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(candidateId2)).thenReturn(Optional.of(candidate2));

        assertThatCode(() -> digestService.sendDailyDigests()).doesNotThrowAnyException();

        verify(asyncEmailSender)
                .sendBestEffort(eq("first@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(asyncEmailSender)
                .sendBestEffort(eq("second@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(jobAlertRepository, times(2)).save(any());
    }
}
