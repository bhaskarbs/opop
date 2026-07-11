package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        adminUserService = new AdminUserService(userRepository, companyProfileRepository);
    }

    @Test
    void listExcludesAdminsAndFiltersByRoleStatusAndQuery() {
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        User company = new User("company@example.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        User admin = new User("admin@example.com", "hash", "Platform Admin", UserRole.ADMIN);
        when(userRepository.findAll()).thenReturn(List.of(candidate, company, admin));
        when(companyProfileRepository.findByUserId(any())).thenReturn(Optional.empty());

        List<AdminUserSummary> all = adminUserService.list(null, null, null);
        assertThat(all).extracting(AdminUserSummary::email).containsExactlyInAnyOrder(
                "candidate@example.com", "company@example.com");

        List<AdminUserSummary> onlyCompanies = adminUserService.list(UserRole.COMPANY, null, null);
        assertThat(onlyCompanies).extracting(AdminUserSummary::email).containsExactly("company@example.com");

        List<AdminUserSummary> queried = adminUserService.list(null, null, "rohan");
        assertThat(queried).extracting(AdminUserSummary::email).containsExactly("candidate@example.com");
    }

    @Test
    void listFiltersBySuspendedStatus() {
        User active = new User("active@example.com", "hash", "Active User", UserRole.CANDIDATE);
        User suspended = new User("suspended@example.com", "hash", "Suspended User", UserRole.CANDIDATE);
        suspended.suspend();
        when(userRepository.findAll()).thenReturn(List.of(active, suspended));

        List<AdminUserSummary> suspendedOnly = adminUserService.list(null, AccountStatus.SUSPENDED, null);
        assertThat(suspendedOnly).extracting(AdminUserSummary::email).containsExactly("suspended@example.com");
    }

    @Test
    void suspendAndReactivateUpdateAccountStatus() {
        User user = new User("user@example.com", "hash", "Some User", UserRole.CANDIDATE);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AdminUserSummary suspended = adminUserService.suspend(user.getId());
        assertThat(suspended.accountStatus()).isEqualTo(AccountStatus.SUSPENDED);

        AdminUserSummary reactivated = adminUserService.reactivate(user.getId());
        assertThat(reactivated.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    void suspendRejectsMissingUser() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminUserService.suspend(UUID.randomUUID()))
                .isInstanceOf(AdminUserNotFoundException.class);
    }
}
