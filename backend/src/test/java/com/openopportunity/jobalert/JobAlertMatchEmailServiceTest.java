package com.openopportunity.jobalert;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
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
class JobAlertMatchEmailServiceTest {

    @Mock
    private JobAlertRepository jobAlertRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private JobAlertMatchEmailService service;

    @BeforeEach
    void setUp() {
        service = new JobAlertMatchEmailService(
                jobAlertRepository, userRepository, asyncEmailSender, "http://localhost:5173");
    }

    private static Job aJob() {
        return new Job(
                UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                List.of("Bengaluru"),
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of("React", "TypeScript"),
                JobStatus.ACTIVE);
    }

    @Test
    void emailsAndMarksNotifiedWhenTheAlertsKeywordMatchesTheJob() {
        Job job = aJob();
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("frontend"), List.of(), null, null);
        User candidate = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
        ArgumentCaptor<JobAlert> captor = ArgumentCaptor.forClass(JobAlert.class);
        verify(jobAlertRepository).save(captor.capture());
        assertThat(captor.getValue()).isSameAs(alert);
    }

    @Test
    void doesNotEmailWhenNoKeywordMatches() {
        Job job = aJob();
        JobAlert alert = new JobAlert(UUID.randomUUID(), List.of("backend"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
        verify(jobAlertRepository, never()).save(any());
    }

    @Test
    void matchesOnSkillsEvenWhenTitleDoesNotContainTheKeyword() {
        Job job = aJob();
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("react"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(userRepository.findById(candidateId))
                .thenReturn(Optional.of(new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE)));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
    }

    @Test
    void anEmptyKeywordsListActsAsNoFilterButExperienceLevelStillMustMatch() {
        Job job = aJob();
        UUID candidateId = UUID.randomUUID();
        JobAlert wrongLevel =
                new JobAlert(candidateId, List.of(), List.of(), ExperienceLevel.ENTRY_LEVEL, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(wrongLevel));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }

    @Test
    void matchesOnLocationSubstring() {
        Job job = aJob();
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of(), List.of("Bengal"), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(userRepository.findById(candidateId))
                .thenReturn(Optional.of(new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE)));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
    }

    @Test
    void matchesOnAnySingleLocationOfAMultiLocationJob() {
        Job job = new Job(
                UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                List.of("Bengaluru", "Mumbai", "Remote"),
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of("React", "TypeScript"),
                JobStatus.ACTIVE);
        UUID candidateId = UUID.randomUUID();
        // "Mumbai" only matches the job's second location — an alert checking just the job's
        // first location (or joining them into one string) would have missed this.
        JobAlert alert = new JobAlert(candidateId, List.of(), List.of("Mumbai"), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(userRepository.findById(candidateId))
                .thenReturn(Optional.of(new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE)));

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
    }

    @Test
    void skipsAnAlertWhoseCandidateNoLongerExists() {
        Job job = aJob();
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("frontend"), List.of(), null, null);
        when(jobAlertRepository.findAll()).thenReturn(List.of(alert));
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());

        service.notifyMatchingAlerts(job);

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }
}
