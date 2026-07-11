package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;

    public AdminUserService(UserRepository userRepository, CompanyProfileRepository companyProfileRepository) {
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
    }

    /** "Basic user management" scope (small local dataset) — filters in memory rather than
     * building SQL Specifications like the Job Service's search does. */
    @Transactional(readOnly = true)
    public List<AdminUserSummary> list(UserRole role, AccountStatus status, String query) {
        String normalizedQuery = query == null ? null : query.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() != UserRole.ADMIN)
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> status == null || user.getAccountStatus() == status)
                .filter(user -> normalizedQuery == null
                        || normalizedQuery.isBlank()
                        || user.getFullName().toLowerCase().contains(normalizedQuery)
                        || user.getEmail().toLowerCase().contains(normalizedQuery))
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public AdminUserSummary suspend(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AdminUserNotFoundException(userId));
        user.suspend();
        userRepository.save(user);
        return toSummary(user);
    }

    @Transactional
    public AdminUserSummary reactivate(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AdminUserNotFoundException(userId));
        user.reactivate();
        userRepository.save(user);
        return toSummary(user);
    }

    private AdminUserSummary toSummary(User user) {
        VerificationStatus verificationStatus = user.getRole() == UserRole.COMPANY
                ? companyProfileRepository.findByUserId(user.getId())
                        .map(CompanyProfile::getVerificationStatus)
                        .orElse(null)
                : null;
        return new AdminUserSummary(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getAccountStatus(),
                verificationStatus,
                user.getCreatedAt());
    }
}
