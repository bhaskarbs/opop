package com.openopportunity.job;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public JobService(JobRepository jobRepository, UserRepository userRepository) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<JobSummary> search(
            String q,
            String location,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.ACTIVE),
                JobSpecifications.matchesKeyword(q),
                JobSpecifications.matchesLocation(location),
                JobSpecifications.hasLevelIn(levels),
                JobSpecifications.hasModeIn(modes),
                JobSpecifications.hasMinSalaryAtLeast(minSalaryLakhs));

        return jobRepository.findAll(spec, resolveSort(sort)).stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public JobDetail getActiveDetail(UUID id) {
        Job job = jobRepository.findById(id).filter(j -> j.getStatus() == JobStatus.ACTIVE).orElseThrow(
                () -> new JobNotFoundException(id));
        return toDetail(job);
    }

    @Transactional(readOnly = true)
    public List<JobSummary> getMine(UUID companyId) {
        return jobRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public JobDetail create(UUID companyId, JobRequest request) {
        User company = userRepository.findById(companyId).orElseThrow();
        Job job = new Job(
                companyId,
                company.getFullName(),
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.location(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        jobRepository.save(job);
        return toDetail(job);
    }

    @Transactional
    public JobDetail update(UUID id, UUID companyId, JobRequest request) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        job.update(
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.location(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        jobRepository.save(job);
        return toDetail(job);
    }

    @Transactional
    public void delete(UUID id, UUID companyId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        jobRepository.delete(job);
    }

    private void requireOwner(Job job, UUID companyId) {
        if (!job.getCompanyId().equals(companyId)) {
            throw new JobAccessDeniedException();
        }
    }

    private static List<String> nonNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    private Sort resolveSort(String sort) {
        if ("salary".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "salaryMaxLakhs");
        }
        // "newest" and the default ("relevant" — no ranking model exists yet) both fall back to
        // recency, which is the only ordering signal this basic search actually has.
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private JobSummary toSummary(Job job) {
        return new JobSummary(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt());
    }

    private JobDetail toDetail(Job job) {
        return new JobDetail(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getApplicationDeadline(),
                job.getAboutRole(),
                job.getResponsibilities(),
                job.getRequirements(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt());
    }
}
