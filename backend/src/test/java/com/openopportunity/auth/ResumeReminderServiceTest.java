package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.mail.AsyncEmailSender;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ResumeReminderServiceTest {

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private ResumeReminderService reminderService;

    @BeforeEach
    void setUp() {
        reminderService = new ResumeReminderService(
                candidateProfileRepository, userRepository, asyncEmailSender, "http://localhost:5173");
    }

    private static CandidateProfile aStaleProfileWithoutAResume(UUID candidateId) {
        CandidateProfile profile = new CandidateProfile(candidateId, "9876543210", List.of("React"), null);
        ReflectionTestUtils.setField(profile, "createdAt", Instant.now().minus(5, ChronoUnit.DAYS));
        return profile;
    }

    @Test
    void sendsAReminderEmailAndMarksItSent() {
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = aStaleProfileWithoutAResume(candidateId);
        User candidate = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(candidateProfileRepository.findByResumeStorageKeyIsNullAndResumeReminderSentAtIsNullAndCreatedAtBefore(
                        any()))
                .thenReturn(List.of(profile));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        reminderService.sendResumeReminders();

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"),
                        anyString(),
                        anyString(),
                        anyList(),
                        any(),
                        any(Runnable.class));
        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository).save(captor.capture());
        assertThat(captor.getValue().getResumeReminderSentAt()).isNotNull();
    }

    @Test
    void skipsACandidateThatNoLongerExistsButStillDoesNotBlowUp() {
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = aStaleProfileWithoutAResume(candidateId);
        when(candidateProfileRepository.findByResumeStorageKeyIsNullAndResumeReminderSentAtIsNullAndCreatedAtBefore(
                        any()))
                .thenReturn(List.of(profile));
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());

        assertThatCode(() -> reminderService.sendResumeReminders()).doesNotThrowAnyException();

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }

    /** Same "one failure shouldn't block the sweep" shape as
     * JobAlertDigestServiceTest#firesOffADigestForEveryMatchingAlertRegardlessOfHowTheOthersFare —
     * actually swallowing a send failure is AsyncEmailSender's own job, not this service's. */
    @Test
    void sendsARemindersForEveryEligibleCandidate() {
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        CandidateProfile profile1 = aStaleProfileWithoutAResume(candidateId1);
        CandidateProfile profile2 = aStaleProfileWithoutAResume(candidateId2);
        User candidate1 = new User("first@example.com", "hash", "First", UserRole.CANDIDATE);
        User candidate2 = new User("second@example.com", "hash", "Second", UserRole.CANDIDATE);
        when(candidateProfileRepository.findByResumeStorageKeyIsNullAndResumeReminderSentAtIsNullAndCreatedAtBefore(
                        any()))
                .thenReturn(List.of(profile1, profile2));
        when(userRepository.findById(candidateId1)).thenReturn(Optional.of(candidate1));
        when(userRepository.findById(candidateId2)).thenReturn(Optional.of(candidate2));

        reminderService.sendResumeReminders();

        verify(asyncEmailSender).sendBestEffort(eq("first@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(asyncEmailSender).sendBestEffort(eq("second@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(candidateProfileRepository, times(2)).save(any());
    }
}
