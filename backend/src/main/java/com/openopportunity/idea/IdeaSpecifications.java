package com.openopportunity.idea;

import org.springframework.data.jpa.domain.Specification;

/** Each method returns {@code null} for an absent filter — Spring Data's {@code and()}/{@code or()}
 * composition treats a null Specification as a no-op, so callers can chain all of these
 * unconditionally regardless of which filters the caller actually supplied (see JobSpecifications). */
final class IdeaSpecifications {

    private IdeaSpecifications() {}

    static Specification<Idea> hasStatus(IdeaStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    static Specification<Idea> matchesKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String pattern = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern), cb.like(cb.lower(root.get("problem")), pattern));
    }

    static Specification<Idea> hasCategory(String category) {
        if (category == null || category.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    static Specification<Idea> hasStage(IdeaStage stage) {
        if (stage == null) return null;
        return (root, query, cb) -> cb.equal(root.get("stage"), stage);
    }
}
