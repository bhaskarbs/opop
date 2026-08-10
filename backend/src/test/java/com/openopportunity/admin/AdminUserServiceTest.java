package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminCandidateProfileSummary;
import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.exception.CandidateResumeNotFoundException;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.storage.FileStorageService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private FileStorageService fileStorageService;

    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        adminUserService = new AdminUserService(
                userRepository, companyProfileRepository, candidateProfileRepository, fileStorageService);
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

    @Test
    void getCandidateDetailCombinesUserAndProfileFields() {
        User user = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        CandidateProfile profile = new CandidateProfile(user.getId(), "9876543210", List.of("Java", "SQL"), null);
        profile.updatePersonalDetails(
                "Bengaluru",
                "Backend Engineer",
                "9876543210",
                ExperienceLevel.SENIOR,
                "Tech",
                null,
                null,
                null,
                null,
                List.of());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));

        AdminCandidateProfileSummary detail = adminUserService.getCandidateDetail(user.getId());

        assertThat(detail.fullName()).isEqualTo("Rohan Mehta");
        assertThat(detail.email()).isEqualTo("candidate@example.com");
        assertThat(detail.location()).isEqualTo("Bengaluru");
        assertThat(detail.title()).isEqualTo("Backend Engineer");
        assertThat(detail.experienceLevel()).isEqualTo(ExperienceLevel.SENIOR);
        assertThat(detail.skills()).containsExactly("Java", "SQL");
    }

    @Test
    void getCandidateDetailFillsNullsWhenNoProfileExistsYet() {
        User user = new User("new@example.com", "hash", "New Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        AdminCandidateProfileSummary detail = adminUserService.getCandidateDetail(user.getId());

        assertThat(detail.fullName()).isEqualTo("New Candidate");
        assertThat(detail.mobile()).isNull();
        assertThat(detail.skills()).isEmpty();
        assertThat(detail.photoUrl()).isNull();
    }

    @Test
    void getCandidateDetailRejectsNonCandidateUser() {
        User company = new User("company@example.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(company.getId())).thenReturn(Optional.of(company));

        assertThatThrownBy(() -> adminUserService.getCandidateDetail(company.getId()))
                .isInstanceOf(AdminUserNotFoundException.class);
    }

    @Test
    void getCandidateResumeLoadsFileFromStorageAndInfersContentType() throws Exception {
        User user = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        CandidateProfile profile = new CandidateProfile(user.getId(), null, List.of(), null);
        profile.updateResume("resume.pdf", "storage-key-123", 2048L, Instant.now());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));
        Resource resource = new ByteArrayResource("dummy".getBytes());
        when(fileStorageService.load("storage-key-123")).thenReturn(resource);

        AdminUserService.LoadedResume loaded = adminUserService.getCandidateResume(user.getId());

        assertThat(loaded.fileName()).isEqualTo("resume.pdf");
        assertThat(loaded.contentType()).isEqualTo("application/pdf");
        assertThat(loaded.resource()).isSameAs(resource);
    }

    @Test
    void getCandidateResumeRejectsCandidateWithNoResumeUploaded() {
        User user = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(candidateProfileRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminUserService.getCandidateResume(user.getId()))
                .isInstanceOf(CandidateResumeNotFoundException.class);
    }

    @Test
    void getCandidateResumeRejectsNonCandidateUser() {
        User company = new User("company@example.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(company.getId())).thenReturn(Optional.of(company));

        assertThatThrownBy(() -> adminUserService.getCandidateResume(company.getId()))
                .isInstanceOf(AdminUserNotFoundException.class);
    }
}
