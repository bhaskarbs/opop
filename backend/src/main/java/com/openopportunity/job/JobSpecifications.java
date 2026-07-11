package com.openopportunity.job;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Each method returns {@code null} for an absent filter — Spring Data's {@code and()}/{@code or()}
 * composition treats a null Specification as a no-op, so callers can chain all of these
 * unconditionally regardless of which filters the caller actually supplied. */
final class JobSpecifications {

    private JobSpecifications() {}

    static Specification<Job> hasStatus(JobStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    static Specification<Job> matchesKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String pattern = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("companyName")), pattern),
                cb.like(
                        cb.lower(cb.function(
                                "array_to_string", String.class, root.get("skills"), cb.literal(","))),
                        pattern));
    }

    static Specification<Job> matchesLocation(String location) {
        if (location == null || location.isBlank()) return null;
        String pattern = "%" + location.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("location")), pattern);
    }

    static Specification<Job> hasLevelIn(List<ExperienceLevel> levels) {
        if (levels == null || levels.isEmpty()) return null;
        return (root, query, cb) -> root.get("experienceLevel").in(levels);
    }

    static Specification<Job> hasModeIn(List<WorkMode> modes) {
        if (modes == null || modes.isEmpty()) return null;
        return (root, query, cb) -> root.get("workMode").in(modes);
    }

    static Specification<Job> hasMinSalaryAtLeast(BigDecimal minSalaryLakhs) {
        if (minSalaryLakhs == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("salaryMaxLakhs"), minSalaryLakhs);
    }
}
