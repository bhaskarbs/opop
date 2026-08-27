package com.openopportunity.auth;

import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Nightly sweep, same shape as ResumeReminderService — nudges a candidate who registered a week
 * ago and still hasn't recorded a single mock interview. "Whether they've taken one" isn't a
 * CandidateProfile column, so the repository only narrows down to "registered before the cutoff,
 * not yet reminded" — this service does the actual zero-sessions check per candidate via
 * MockInterviewSessionRepository. One-shot per candidate (see
 * CandidateProfile#markMockInterviewReminderSent), not a recurring nag — someone who's already
 * recorded a session (even a bad one) has already gotten the point. */
@Service
public class MockInterviewReminderService {

    private static final int REMINDER_DELAY_DAYS = 7;

    private final CandidateProfileRepository candidateProfileRepository;
    private final UserRepository userRepository;
    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public MockInterviewReminderService(
            CandidateProfileRepository candidateProfileRepository,
            UserRepository userRepository,
            MockInterviewSessionRepository mockInterviewSessionRepository,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.candidateProfileRepository = candidateProfileRepository;
        this.userRepository = userRepository;
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Scheduled(cron = "0 30 9 * * *")
    @Transactional
    public void sendMockInterviewReminders() {
        Instant cutoff = Instant.now().minus(REMINDER_DELAY_DAYS, ChronoUnit.DAYS);
        for (CandidateProfile profile :
                candidateProfileRepository.findByMockInterviewReminderSentAtIsNullAndCreatedAtBefore(cutoff)) {
            if (mockInterviewSessionRepository.countByCandidateId(profile.getUserId()) == 0) {
                sendReminderEmail(profile);
            }
            profile.markMockInterviewReminderSent(Instant.now());
            candidateProfileRepository.save(profile);
        }
    }

    private void sendReminderEmail(CandidateProfile profile) {
        User candidate = userRepository.findById(profile.getUserId()).orElse(null);
        if (candidate == null) {
            return;
        }
        asyncEmailSender.sendBestEffort(
                candidate.getEmail(),
                "Try a mock interview — see how you really come across",
                "Try a mock interview",
                List.of(
                        "Hi " + candidate.getFullName() + ",",
                        "You joined OpenOpportunity a week ago but haven't taken a mock interview yet."
                                + " It's the best way to understand how you actually sound and answer"
                                + " under interview conditions.",
                        "Here's a tip: record one now, then watch it back in a couple of months."
                                + " You'll spot the real mistakes — pacing, filler words, body language —"
                                + " in a way you never could from memory alone."),
                new EmailButton("Take a mock interview", frontendBaseUrl + "/en/candidate/mock-interview"),
                () -> {});
    }
}
