package com.openopportunity.auth;

import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Nightly sweep, same cron-scheduling pattern as JobAlertDigestService — nudges a candidate who
 * registered 2+ days ago and still hasn't uploaded a resume, once, so they don't silently miss
 * out on jobs a company can't consider them for without one. One-shot per candidate (see
 * CandidateProfile#markResumeReminderSent) rather than a recurring reminder — this is a
 * "you forgot a step" nudge, not a drip campaign. Best-effort and off this method's own thread
 * (see AsyncEmailSender): a delivery failure for one candidate never blocks the sweep from
 * moving on to the rest. */
@Service
public class ResumeReminderService {

    private static final int REMINDER_DELAY_DAYS = 2;

    private final CandidateProfileRepository candidateProfileRepository;
    private final UserRepository userRepository;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public ResumeReminderService(
            CandidateProfileRepository candidateProfileRepository,
            UserRepository userRepository,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.candidateProfileRepository = candidateProfileRepository;
        this.userRepository = userRepository;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendResumeReminders() {
        Instant cutoff = Instant.now().minus(REMINDER_DELAY_DAYS, ChronoUnit.DAYS);
        for (CandidateProfile profile :
                candidateProfileRepository.findByResumeStorageKeyIsNullAndResumeReminderSentAtIsNullAndCreatedAtBefore(
                        cutoff)) {
            sendReminderEmail(profile);
            profile.markResumeReminderSent(Instant.now());
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
                "Don't miss out on job opportunities — upload your resume",
                "Upload your resume",
                List.of(
                        "Hi " + candidate.getFullName() + ",",
                        "You joined OpenOpportunity but haven't uploaded a resume yet. Companies can't"
                                + " consider you for a role without one — add yours now so you don't miss"
                                + " out on jobs matching your skills."),
                new EmailButton("Upload your resume", frontendBaseUrl + "/en/candidate/profile"),
                () -> {});
    }
}
