package com.openopportunity.job;

import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fires once a job goes live (see JobService#approve — a job is never visible to candidates
 * before that) — emails every candidate whose profile is a plausible fit: at least one
 * case-insensitive shared skill, and either no self-reported experience level on file or one
 * that matches the job's exactly. Deliberately mirrors JobAlertDigestService's shape (a
 * hand-built, job-specific email via AsyncEmailSender, not the generic NotificationService
 * pipeline) since that's the existing precedent for "a real email about a specific job", not
 * NotificationService's generic "you have a new notification" template.
 *
 * <p>Best-effort per candidate, same reasoning as JobAlertDigestService: a slow/failed send for
 * one candidate never blocks the rest, and — since AsyncEmailSender runs on its own executor —
 * never blocks the admin's approve() call either. No cap on the number of candidates matched;
 * JobAlertDigestService's nightly sweep doesn't cap recipients either, so this stays consistent
 * with that rather than inventing a limit neither precedent has. */
@Service
public class NewJobMatchEmailService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final UserRepository userRepository;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public NewJobMatchEmailService(
            CandidateProfileRepository candidateProfileRepository,
            UserRepository userRepository,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.candidateProfileRepository = candidateProfileRepository;
        this.userRepository = userRepository;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional(readOnly = true)
    public void notifyMatchingCandidates(Job job) {
        Set<String> jobSkills = job.getSkills().stream()
                .map(skill -> skill.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        // A job with no skills listed at all can't plausibly match anyone on skill overlap —
        // treat that as "nothing to notify" rather than emailing every candidate with a null/
        // empty experience level (which would otherwise vacuously pass the experience check).
        if (jobSkills.isEmpty()) {
            return;
        }

        List<CandidateProfile> matches = candidateProfileRepository.findAll().stream()
                .filter(profile -> isMatch(profile, jobSkills, job.getExperienceLevel()))
                .toList();
        if (matches.isEmpty()) {
            return;
        }

        Map<UUID, User> usersById = userRepository
                .findAllById(matches.stream().map(CandidateProfile::getUserId).toList())
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        String jobUrl = frontendBaseUrl + "/en/jobs/" + job.getId();
        for (CandidateProfile profile : matches) {
            User candidate = usersById.get(profile.getUserId());
            if (candidate == null) {
                continue;
            }
            asyncEmailSender.sendBestEffort(
                    candidate.getEmail(),
                    "New job matching your profile: " + job.getTitle(),
                    "A new job matches your profile",
                    List.of(
                            job.getTitle() + " at " + job.getCompanyName() + " — " + job.getLocation(),
                            "We matched this to your profile based on your skills and experience level."),
                    new EmailButton("View job", jobUrl),
                    () -> {});
        }
    }

    private boolean isMatch(CandidateProfile profile, Set<String> jobSkills, ExperienceLevel jobExperienceLevel) {
        boolean skillOverlap = profile.getSkills().stream()
                .map(skill -> skill.toLowerCase(Locale.ROOT))
                .anyMatch(jobSkills::contains);
        boolean experienceMatches =
                profile.getExperienceLevel() == null || profile.getExperienceLevel() == jobExperienceLevel;
        return skillOverlap && experienceMatches;
    }
}
