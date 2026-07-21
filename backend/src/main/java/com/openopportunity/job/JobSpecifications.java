package com.openopportunity.job;

import jakarta.persistence.criteria.Expression;
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

    /** Matches a job if ANY of the given keywords hits its title, company name, or skills —
     * candidates can now tag multiple skills/roles in the search bar rather than one keyword.
     * Built via Specification.anyOf (the same idiom as the top-level Specification.allOf in
     * JobService) rather than a hand-built CriteriaBuilder.or(Predicate[]) — the latter silently
     * behaved like an AND once there were 2+ predicates in the array. */
    static Specification<Job> matchesAnyKeyword(List<String> keywords) {
        List<String> normalized = normalize(keywords);
        if (normalized.isEmpty()) return null;
        return Specification.anyOf(normalized.stream().map(JobSpecifications::matchesKeyword).toList());
    }

    private static Specification<Job> matchesKeyword(String keyword) {
        String pattern = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Expression<String> skillsJoined = cb.lower(cb.function(
                    "array_to_string", String.class, root.get("skills"), cb.literal(",")));
            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("companyName")), pattern),
                    cb.like(skillsJoined, pattern));
        };
    }

    /** Matches a job if ANY of the given locations is a substring of its location — same
     * multi-value relaxation as matchesAnyKeyword, for the search bar's city tags. */
    static Specification<Job> matchesAnyLocation(List<String> locations) {
        List<String> normalized = normalize(locations);
        if (normalized.isEmpty()) return null;
        return Specification.anyOf(normalized.stream().map(JobSpecifications::matchesLocation).toList());
    }

    private static Specification<Job> matchesLocation(String location) {
        String pattern = "%" + location.toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("location")), pattern);
    }

    private static List<String> normalize(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream().filter(value -> value != null && !value.isBlank()).map(String::trim).toList();
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
