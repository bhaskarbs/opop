package com.openopportunity.auth;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CandidateProfileRepository
        extends JpaRepository<CandidateProfile, UUID>, JpaSpecificationExecutor<CandidateProfile> {

    Optional<CandidateProfile> findByUserId(UUID userId);

    List<CandidateProfile> findByUserIdIn(Collection<UUID> userIds);

    long countByResumeStorageKeyIsNotNull();

    long countByResumeStorageKeyIsNotNullAndResumeUploadedAtAfter(Instant since);

    // Backs ResumeReminderService's nightly sweep — candidates who registered before the cutoff
    // (e.g. 2+ days ago), still have no resume uploaded, and haven't already gotten this
    // one-shot nudge.
    List<CandidateProfile> findByResumeStorageKeyIsNullAndResumeReminderSentAtIsNullAndCreatedAtBefore(
            Instant cutoff);

    // Backs MockInterviewReminderService's nightly sweep — candidates who registered before the
    // cutoff (e.g. a week ago) and haven't already gotten this one-shot nudge. Whether they've
    // actually taken a mock interview isn't a CandidateProfile column (see
    // MockInterviewSessionRepository.countByCandidateId), so that part of the filter happens in
    // the service, per candidate, over this already-narrowed pool.
    List<CandidateProfile> findByMockInterviewReminderSentAtIsNullAndCreatedAtBefore(Instant cutoff);
}
