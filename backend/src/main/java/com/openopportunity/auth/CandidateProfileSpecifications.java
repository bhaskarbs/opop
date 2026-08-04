package com.openopportunity.auth;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Each method returns {@code null} for an absent filter — Spring Data's {@code and()}/{@code or()}
 * composition treats a null Specification as a no-op, so callers can chain all of these
 * unconditionally regardless of which filters the caller actually supplied. Same idiom as
 * JobSpecifications, which this mirrors — CandidateSearchService#search used to fetch every
 * CandidateProfile row and filter/sort in Java (a full table scan on every search); this pushes
 * the actual filtering down to Postgres instead. */
final class CandidateProfileSpecifications {

    private CandidateProfileSpecifications() {}

    /** Matches a candidate if the query hits their title, skills, or full name — the latter
     * lives on User, not CandidateProfile, and the two aren't a mapped JPA association (every
     * other cross-entity lookup in this service goes through a separate repository call + Map
     * join instead), so it's checked via a correlated EXISTS subquery rather than a Criteria
     * join. */
    static Specification<CandidateProfile> matchesQuery(String q) {
        if (q == null || q.isBlank()) return null;
        String pattern = "%" + q.trim().toLowerCase() + "%";
        return (root, query, cb) -> {
            Subquery<UUID> matchingUser = query.subquery(UUID.class);
            Root<User> userRoot = matchingUser.from(User.class);
            matchingUser
                    .select(userRoot.get("id"))
                    .where(
                            cb.equal(userRoot.get("id"), root.get("userId")),
                            cb.like(cb.lower(userRoot.get("fullName")), pattern));

            // immutable_array_to_string (see V54 migration), not the built-in array_to_string —
            // the built-in is STABLE rather than IMMUTABLE, so idx_candidate_profiles_skills_trgm's
            // expression index only matches (and only gets used by the planner for) this exact
            // function.
            Expression<String> skillsJoined = cb.lower(
                    cb.function("immutable_array_to_string", String.class, root.get("skills"), cb.literal(",")));
            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(skillsJoined, pattern),
                    cb.exists(matchingUser));
        };
    }

    /** Matches if ANY of the given locations is a substring of the candidate's location — same
     * multi-value relaxation as JobSpecifications.matchesAnyLocation, for the location filter's
     * city tags. */
    static Specification<CandidateProfile> matchesAnyLocation(List<String> locations) {
        List<String> normalized = normalize(locations);
        if (normalized.isEmpty()) return null;
        return Specification.anyOf(normalized.stream().map(CandidateProfileSpecifications::matchesLocation).toList());
    }

    private static Specification<CandidateProfile> matchesLocation(String location) {
        String pattern = "%" + location.toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("location")), pattern);
    }

    private static List<String> normalize(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream().filter(value -> value != null && !value.isBlank()).map(String::trim).toList();
    }
}
