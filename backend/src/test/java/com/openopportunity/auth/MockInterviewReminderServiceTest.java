package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
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
class MockInterviewReminderServiceTest {

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MockInterviewSessionRepository mockInterviewSessionRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private MockInterviewReminderService reminderService;

    @BeforeEach
    void setUp() {
        reminderService = new MockInterviewReminderService(
                candidateProfileRepository,
                userRepository,
                mockInterviewSessionRepository,
                asyncEmailSender,
                "http://localhost:5173");
    }

    private static CandidateProfile aWeekOldProfile(UUID candidateId) {
        CandidateProfile profile = new CandidateProfile(candidateId, "9876543210", List.of("React"), null);
        ReflectionTestUtils.setField(profile, "createdAt", Instant.now().minus(10, ChronoUnit.DAYS));
        return profile;
    }

    @Test
    void sendsAReminderEmailAndMarksItSentWhenNoSessionExists() {
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = aWeekOldProfile(candidateId);
        User candidate = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(candidateProfileRepository.findByMockInterviewReminderSentAtIsNullAndCreatedAtBefore(any()))
                .thenReturn(List.of(profile));
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        reminderService.sendMockInterviewReminders();

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"), anyString(), anyString(), anyList(), any(), any(Runnable.class));
        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository).save(captor.capture());
        assertThat(captor.getValue().getMockInterviewReminderSentAt()).isNotNull();
    }

    /** The whole point of this reminder — someone who's already recorded a session (even a bad
     * one) has already gotten the point, so no email, but the one-shot flag still gets set so
     * this candidate is never re-evaluated by the sweep again. */
    @Test
    void skipsTheEmailButStillMarksSentWhenACandidateAlreadyRecordedASession() {
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = aWeekOldProfile(candidateId);
        when(candidateProfileRepository.findByMockInterviewReminderSentAtIsNullAndCreatedAtBefore(any()))
                .thenReturn(List.of(profile));
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(1L);

        reminderService.sendMockInterviewReminders();

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
        verify(userRepository, never()).findById(any());
        ArgumentCaptor<CandidateProfile> captor = ArgumentCaptor.forClass(CandidateProfile.class);
        verify(candidateProfileRepository).save(captor.capture());
        assertThat(captor.getValue().getMockInterviewReminderSentAt()).isNotNull();
    }

    @Test
    void skipsACandidateThatNoLongerExists() {
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = aWeekOldProfile(candidateId);
        when(candidateProfileRepository.findByMockInterviewReminderSentAtIsNullAndCreatedAtBefore(any()))
                .thenReturn(List.of(profile));
        when(mockInterviewSessionRepository.countByCandidateId(candidateId)).thenReturn(0L);
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());

        reminderService.sendMockInterviewReminders();

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }
}
