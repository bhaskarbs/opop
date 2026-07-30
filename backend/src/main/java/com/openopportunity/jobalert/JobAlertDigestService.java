package com.openopportunity.jobalert;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.mail.EmailButton;
import com.openopportunity.mail.EmailService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Nightly sweep, same cron-scheduling pattern as CompanyBillingService.expireOverdueSubscriptions
 * — for every saved alert, finds jobs posted since it last ran and emails a digest if there are
 * any. Best-effort like every other email in the app (see EmailService): a delivery failure for
 * one candidate's digest never blocks the sweep from finishing the rest. */
@Service
public class JobAlertDigestService {

    private static final Logger log = LoggerFactory.getLogger(JobAlertDigestService.class);
    private static final int MAX_JOBS_LISTED_PER_EMAIL = 10;

    private final JobAlertRepository jobAlertRepository;
    private final UserRepository userRepository;
    private final JobService jobService;
    private final EmailService emailService;
    private final String frontendBaseUrl;

    public JobAlertDigestService(
            JobAlertRepository jobAlertRepository,
            UserRepository userRepository,
            JobService jobService,
            EmailService emailService,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.jobAlertRepository = jobAlertRepository;
        this.userRepository = userRepository;
        this.jobService = jobService;
        this.emailService = emailService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendDailyDigests() {
        Instant startedAt = Instant.now();
        for (JobAlert alert : jobAlertRepository.findAll()) {
            List<JobSummary> matches = matchingJobs(alert);
            if (!matches.isEmpty()) {
                sendDigestEmail(alert, matches);
            }
            alert.markNotified(startedAt);
            jobAlertRepository.save(alert);
        }
    }

    private List<JobSummary> matchingJobs(JobAlert alert) {
        return jobService.searchPostedAfter(
                alert.getKeywords(),
                alert.getLocations(),
                singleOrEmpty(alert.getExperienceLevel()),
                singleOrEmpty(alert.getWorkMode()),
                alert.getLastNotifiedAt());
    }

    private void sendDigestEmail(JobAlert alert, List<JobSummary> matches) {
        User candidate = userRepository.findById(alert.getCandidateId()).orElse(null);
        if (candidate == null) {
            return;
        }
        List<String> paragraphs = new ArrayList<>();
        paragraphs.add(
                matches.size() == 1
                        ? "1 new job matches your alert:"
                        : matches.size() + " new jobs match your alert:");
        matches.stream()
                .limit(MAX_JOBS_LISTED_PER_EMAIL)
                .forEach(job -> paragraphs.add(job.title() + " at " + job.companyName() + " — " + job.location()));
        if (matches.size() > MAX_JOBS_LISTED_PER_EMAIL) {
            paragraphs.add("+ " + (matches.size() - MAX_JOBS_LISTED_PER_EMAIL) + " more.");
        }
        try {
            emailService.send(
                    candidate.getEmail(),
                    "New jobs matching your alert",
                    "New jobs matching your alert",
                    paragraphs,
                    new EmailButton("View all matching jobs", frontendBaseUrl + "/en/jobs"));
        } catch (MailException ex) {
            log.warn("Could not send job alert digest to {}: {}", candidate.getEmail(), ex.getMessage());
        }
    }

    private static <T> List<T> singleOrEmpty(T value) {
        return value == null ? List.of() : List.of(value);
    }
}
