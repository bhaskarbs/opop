package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminTeamMemberSummary;
import com.openopportunity.admin.dto.CreateAdminTeamMemberRequest;
import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.admin.exception.CannotDeleteSuperAdminException;
import com.openopportunity.admin.exception.DuplicateAdminEmailException;
import com.openopportunity.admin.exception.InvalidAdminLevelException;
import com.openopportunity.auth.AdminLevel;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages reviewer/admin accounts — the one capability this app has no self-registration flow
 * for by design (see AuthService#parseRegistrationRole). Only a SUPER_ADMIN may call create/
 * delete (enforced both here, defense-in-depth, and at the URL level in SecurityConfig); any
 * admin-tier account may list. */
@Service
public class AdminTeamService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminTeamService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AdminTeamMemberSummary> list() {
        return userRepository.findByRole(UserRole.ADMIN).stream()
                .map(AdminTeamService::toSummary)
                .sorted((a, b) -> a.createdAt().compareTo(b.createdAt()))
                .toList();
    }

    /** Deliberately can't create another SUPER_ADMIN through this endpoint — provisioning the
     * most privileged tier stays a manual/seeded operation (see AdminSeeder), not something a
     * super-admin can do to themselves-adjacent accounts via the UI. */
    @Transactional
    public AdminTeamMemberSummary create(CreateAdminTeamMemberRequest request) {
        AdminLevel adminLevel = parseCreatableLevel(request.adminLevel());
        if (userRepository.existsByEmailAndRole(request.email(), UserRole.ADMIN)) {
            throw new DuplicateAdminEmailException(request.email());
        }
        User user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.fullName(),
                UserRole.ADMIN,
                adminLevel);
        // User's @Id is manually assigned in its constructor (not @GeneratedValue), so Spring
        // Data can't tell this is a brand-new row and routes save() through merge() rather than
        // persist() — merge() returns a different, newly-managed instance and never mutates the
        // object passed in. Reading fields (like createdAt, set by @PrePersist) off the original
        // `user` reference after save() would see stale/default values; the returned entity is
        // the one that's actually current.
        User saved = userRepository.save(user);
        return toSummary(saved);
    }

    @Transactional
    public void delete(UUID id, UUID callerId) {
        User user = userRepository
                .findById(id)
                .filter(existing -> existing.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new AdminUserNotFoundException(id));
        if (user.getAdminLevel() == AdminLevel.SUPER_ADMIN || user.getId().equals(callerId)) {
            throw new CannotDeleteSuperAdminException();
        }
        userRepository.delete(user);
    }

    private static AdminLevel parseCreatableLevel(String raw) {
        AdminLevel level;
        try {
            level = AdminLevel.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidAdminLevelException(raw);
        }
        if (level == AdminLevel.SUPER_ADMIN) {
            throw new InvalidAdminLevelException(raw);
        }
        return level;
    }

    private static AdminTeamMemberSummary toSummary(User user) {
        return new AdminTeamMemberSummary(
                user.getId(), user.getEmail(), user.getFullName(), user.getAdminLevel(), user.getCreatedAt());
    }
}
