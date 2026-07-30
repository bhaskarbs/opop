package com.openopportunity.savedjob;

import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.JobNotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobRepository jobRepository;
    private final JobService jobService;

    public SavedJobService(SavedJobRepository savedJobRepository, JobRepository jobRepository, JobService jobService) {
        this.savedJobRepository = savedJobRepository;
        this.jobRepository = jobRepository;
        this.jobService = jobService;
    }

    /** Idempotent — bookmarking an already-saved job is a no-op rather than an error, since the
     * frontend drives this from a single toggle button with no separate "already saved" state
     * to react to. */
    @Transactional
    public void save(UUID candidateId, UUID jobId) {
        if (savedJobRepository.existsByCandidateIdAndJobId(candidateId, jobId)) {
            return;
        }
        if (!jobRepository.existsById(jobId)) {
            throw new JobNotFoundException(jobId);
        }
        savedJobRepository.save(new SavedJob(candidateId, jobId));
    }

    /** Also idempotent, for the same reason as save() — unsaving something that isn't saved
     * (e.g. a double-click, or two tabs racing) just leaves nothing to delete. */
    @Transactional
    public void unsave(UUID candidateId, UUID jobId) {
        savedJobRepository.deleteByCandidateIdAndJobId(candidateId, jobId);
    }

    /** Most-recently-saved first. A job deleted since being bookmarked is silently dropped (see
     * JobService.getByIds) rather than shown as a broken row. */
    @Transactional(readOnly = true)
    public List<JobSummary> getMine(UUID candidateId) {
        List<UUID> jobIdsInOrder = savedJobRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(SavedJob::getJobId)
                .toList();
        Map<UUID, JobSummary> summariesById =
                jobService.getByIds(jobIdsInOrder).stream().collect(Collectors.toMap(JobSummary::id, Function.identity()));
        return jobIdsInOrder.stream().map(summariesById::get).filter(summary -> summary != null).toList();
    }
}
