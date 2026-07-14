package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateSearchSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Small local dataset — filters in memory rather than building SQL Specifications like the
 * Job Service's search does, same approach AdminUserService takes for its own cross-entity
 * (User + CompanyProfile) search. There's no "visible to companies" opt-out anywhere yet — every
 * registered candidate is searchable, matching what the mock UI this replaces assumed. */
@Service
public class CandidateSearchService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;

    public CandidateSearchService(
            UserRepository userRepository, CandidateProfileRepository candidateProfileRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<CandidateSearchSummary> search(String q, String location) {
        String normalizedQuery = q == null ? null : q.trim().toLowerCase();
        String normalizedLocation = location == null ? null : location.trim().toLowerCase();

        List<CandidateProfile> profiles = candidateProfileRepository.findAll();
        Map<UUID, User> usersById = userRepository
                .findAllById(profiles.stream().map(CandidateProfile::getUserId).toList())
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return profiles.stream()
                .filter(profile -> usersById.containsKey(profile.getUserId()))
                .filter(profile -> matchesQuery(profile, usersById.get(profile.getUserId()), normalizedQuery))
                .filter(profile -> matchesLocation(profile, normalizedLocation))
                .map(profile -> toSummary(profile, usersById.get(profile.getUserId())))
                .toList();
    }

    private boolean matchesQuery(CandidateProfile profile, User user, String normalizedQuery) {
        if (normalizedQuery == null || normalizedQuery.isBlank()) {
            return true;
        }
        if (user.getFullName().toLowerCase().contains(normalizedQuery)) {
            return true;
        }
        if (profile.getTitle() != null && profile.getTitle().toLowerCase().contains(normalizedQuery)) {
            return true;
        }
        return profile.getSkills().stream().anyMatch(skill -> skill.toLowerCase().contains(normalizedQuery));
    }

    private boolean matchesLocation(CandidateProfile profile, String normalizedLocation) {
        if (normalizedLocation == null || normalizedLocation.isBlank()) {
            return true;
        }
        return profile.getLocation() != null && profile.getLocation().toLowerCase().contains(normalizedLocation);
    }

    private CandidateSearchSummary toSummary(CandidateProfile profile, User user) {
        return new CandidateSearchSummary(
                user.getId(), user.getFullName(), profile.getTitle(), profile.getLocation(), profile.getSkills());
    }
}
