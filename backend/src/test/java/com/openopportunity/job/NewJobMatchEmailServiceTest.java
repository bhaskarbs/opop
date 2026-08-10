package com.openopportunity.job;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NewJobMatchEmailServiceTest {

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private NewJobMatchEmailService service;

    @BeforeEach
    void setUp() {
        service = new NewJobMatchEmailService(
                candidateProfileRepository, userRepository, asyncEmailSender, "http://localhost:5173");
    }

    private static Job jobRequiring(ExperienceLevel level, String... skills) {
        return new Job(
                java.util.UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                level,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(skills),
                JobStatus.ACTIVE);
    }

    @Test
    void emailsOnlyCandidatesWithASharedSkillAndAMatchingOrUnsetExperienceLevel() {
        Job job = jobRequiring(ExperienceLevel.SENIOR, "Java", "React");

        User skillAndLevelMatch = new User("a@example.com", "hash", "A", UserRole.CANDIDATE);
        CandidateProfile skillAndLevelMatchProfile =
                new CandidateProfile(skillAndLevelMatch.getId(), "9000000000", List.of("Java"), null);
        skillAndLevelMatchProfile.updatePersonalDetails(
                null, null, "9000000000", ExperienceLevel.SENIOR, null, null, null, null, null, List.of());

        User skillMismatch = new User("b@example.com", "hash", "B", UserRole.CANDIDATE);
        CandidateProfile skillMismatchProfile =
                new CandidateProfile(skillMismatch.getId(), "9000000001", List.of("Python"), null);
        skillMismatchProfile.updatePersonalDetails(
                null, null, "9000000001", ExperienceLevel.SENIOR, null, null, null, null, null, List.of());

        User levelMismatch = new User("c@example.com", "hash", "C", UserRole.CANDIDATE);
        CandidateProfile levelMismatchProfile =
                new CandidateProfile(levelMismatch.getId(), "9000000002", List.of("Java"), null);
        levelMismatchProfile.updatePersonalDetails(
                null, null, "9000000002", ExperienceLevel.ENTRY_LEVEL, null, null, null, null, null, List.of());

        User skillMatchNoLevelSet = new User("d@example.com", "hash", "D", UserRole.CANDIDATE);
        CandidateProfile skillMatchNoLevelSetProfile =
                new CandidateProfile(skillMatchNoLevelSet.getId(), "9000000003", List.of("react"), null);

        when(candidateProfileRepository.findAll())
                .thenReturn(List.of(
                        skillAndLevelMatchProfile,
                        skillMismatchProfile,
                        levelMismatchProfile,
                        skillMatchNoLevelSetProfile));
        when(userRepository.findAllById(any()))
                .thenReturn(List.of(skillAndLevelMatch, skillMismatch, levelMismatch, skillMatchNoLevelSet));

        service.notifyMatchingCandidates(job);

        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("a@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("d@example.com"), anyString(), anyString(), anyList(), any(EmailButton.class), any());
        verify(asyncEmailSender, never())
                .sendBestEffort(eq("b@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(asyncEmailSender, never())
                .sendBestEffort(eq("c@example.com"), anyString(), anyString(), anyList(), any(), any());
        verify(asyncEmailSender, times(2)).sendBestEffort(any(), anyString(), anyString(), anyList(), any(), any());
    }

    @Test
    void doesNothingWhenTheJobHasNoSkillsListed() {
        Job job = jobRequiring(ExperienceLevel.SENIOR);

        service.notifyMatchingCandidates(job);

        verify(candidateProfileRepository, never()).findAll();
        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }
}
