package com.openopportunity.jobalert;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Nightly sweep, same cron-scheduling pattern as CompanyBillingService.expireOverdueSubscriptions
 * — for every saved alert, finds jobs posted since it last ran and emails a digest if there are
 * any. Best-effort and off this method's own thread (see AsyncEmailSender): a delivery failure —
 * or just a slow SMTP connection — for one candidate's digest never blocks the sweep from moving
 * on to the rest. */
@Service
public class JobAlertDigestService {

    private static final int MAX_JOBS_LISTED_PER_EMAIL = 10;

    private final JobAlertRepository jobAlertRepository;
    private final UserRepository userRepository;
    private final JobService jobService;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public JobAlertDigestService(
            JobAlertRepository jobAlertRepository,
            UserRepository userRepository,
            JobService jobService,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.jobAlertRepository = jobAlertRepository;
        this.userRepository = userRepository;
        this.jobService = jobService;
        this.asyncEmailSender = asyncEmailSender;
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
        asyncEmailSender.sendBestEffort(
                candidate.getEmail(),
                "New jobs matching your alert",
                "New jobs matching your alert",
                paragraphs,
                new EmailButton("View all matching jobs", frontendBaseUrl + "/en/jobs"),
                () -> {});
    }

    private static <T> List<T> singleOrEmpty(T value) {
        return value == null ? List.of() : List.of(value);
    }
}
