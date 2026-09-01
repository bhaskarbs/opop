package com.openopportunity.jobalert;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.Job;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fires once a job goes live (see JobService#approve) — immediately emails every candidate
 * whose saved JobAlert matches this specific job, rather than making them wait for
 * JobAlertDigestService's next 8am sweep. Matching mirrors JobSpecifications' semantics exactly
 * (same case-insensitive keyword/location substring rules against title/companyName/skills and
 * location, same exact experienceLevel/workMode equality when the alert has one set) — a job
 * that would show up in the nightly digest matches here too, and vice versa.
 *
 * <p>Marks the alert notified (same as JobAlertDigestService.sendDailyDigests does) so this job
 * doesn't also show up in tomorrow's digest — without that, a candidate would get two emails
 * about the same job: one now, one again at the next nightly sweep. */
@Service
public class JobAlertMatchEmailService {

    private final JobAlertRepository jobAlertRepository;
    private final UserRepository userRepository;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public JobAlertMatchEmailService(
            JobAlertRepository jobAlertRepository,
            UserRepository userRepository,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.jobAlertRepository = jobAlertRepository;
        this.userRepository = userRepository;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public void notifyMatchingAlerts(Job job) {
        Instant notifiedAt = Instant.now();
        for (JobAlert alert : jobAlertRepository.findAll()) {
            if (!matches(alert, job)) {
                continue;
            }
            sendMatchEmail(alert, job);
            // Same bookkeeping the nightly sweep does — see class doc for why this matters.
            alert.markNotified(notifiedAt);
            jobAlertRepository.save(alert);
        }
    }

    private boolean matches(JobAlert alert, Job job) {
        return matchesKeywords(alert.getKeywords(), job)
                && matchesLocations(alert.getLocations(), job)
                && (alert.getExperienceLevel() == null || alert.getExperienceLevel() == job.getExperienceLevel())
                && (alert.getWorkMode() == null || alert.getWorkMode() == job.getWorkMode());
    }

    private boolean matchesKeywords(List<String> keywords, Job job) {
        List<String> normalized = normalize(keywords);
        if (normalized.isEmpty()) {
            return true;
        }
        String title = job.getTitle().toLowerCase(Locale.ROOT);
        String companyName = job.getCompanyName().toLowerCase(Locale.ROOT);
        List<String> skills =
                job.getSkills().stream().map(skill -> skill.toLowerCase(Locale.ROOT)).toList();
        return normalized.stream()
                .anyMatch(keyword -> title.contains(keyword)
                        || companyName.contains(keyword)
                        || skills.stream().anyMatch(skill -> skill.contains(keyword)));
    }

    private boolean matchesLocations(List<String> locations, Job job) {
        List<String> normalized = normalize(locations);
        if (normalized.isEmpty()) {
            return true;
        }
        List<String> jobLocations =
                job.getLocations().stream().map(location -> location.toLowerCase(Locale.ROOT)).toList();
        return normalized.stream()
                .anyMatch(term -> jobLocations.stream().anyMatch(jobLocation -> jobLocation.contains(term)));
    }

    // Same rule as JobSpecifications.normalize: strip null/blank entries, lowercase and trim
    // what's left; an empty result (including "the caller passed nothing at all") means "no
    // filter", not "match nothing".
    private static List<String> normalize(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .toList();
    }

    private void sendMatchEmail(JobAlert alert, Job job) {
        User candidate = userRepository.findById(alert.getCandidateId()).orElse(null);
        if (candidate == null) {
            return;
        }
        asyncEmailSender.sendBestEffort(
                candidate.getEmail(),
                "New job matching your alert: " + job.getTitle(),
                "A new job matches your alert",
                List.of(job.getTitle() + " at " + job.getCompanyName() + " — "
                        + String.join(", ", job.getLocations())),
                new EmailButton("View job", frontendBaseUrl + "/en/jobs/" + job.getId()),
                () -> {});
    }
}
