package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import com.openopportunity.admin.exception.CompanyProfileIncompleteException;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.CompanyCertificateService;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import com.openopportunity.notification.NotificationService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminCompanyServiceTest {

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private CompanyCertificateService companyCertificateService;

    private AdminCompanyService adminCompanyService;

    @BeforeEach
    void setUp() {
        adminCompanyService = new AdminCompanyService(
                companyProfileRepository, userRepository, notificationService, companyCertificateService);
    }

    private User companyUser() {
        return new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
    }

    @Test
    void getPendingReturnsOnlyPendingProfiles() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory", "9876543210", null);
        when(companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING))
                .thenReturn(List.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(companyCertificateService.list(user.getId())).thenReturn(List.of());

        List<AdminCompanyProfileSummary> pending = adminCompanyService.getPending(null);

        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).companyName()).isEqualTo("Vertex Robotics");
        assertThat(pending.get(0).verificationStatus()).isEqualTo(VerificationStatus.PENDING);
    }

    @Test
    void verifySetsStatusToVerified() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory", "9876543210", null);
        when(companyProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(companyCertificateService.list(user.getId())).thenReturn(List.of());

        AdminCompanyProfileSummary summary = adminCompanyService.verify(user.getId());

        assertThat(summary.verificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
    }

    @Test
    void rejectSetsStatusToRejected() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory", "9876543210", null);
        when(companyProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(companyCertificateService.list(user.getId())).thenReturn(List.of());

        AdminCompanyProfileSummary summary = adminCompanyService.reject(user.getId());

        assertThat(summary.verificationStatus()).isEqualTo(VerificationStatus.REJECTED);
    }

    @Test
    void verifyRejectsMissingProfile() {
        when(companyProfileRepository.findByUserId(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminCompanyService.verify(UUID.randomUUID()))
                .isInstanceOf(CompanyProfileNotFoundException.class);
    }

    @Test
    void getPendingExcludesIncompleteProfiles() {
        User user = companyUser();
        // Blank profile, as left by AuthService.loginWithGoogleAsCompany right after sign-in —
        // nothing here for an admin to review yet.
        CompanyProfile blank = new CompanyProfile(user.getId(), null, null, null, null, null, null, null, null, null);
        when(companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING))
                .thenReturn(List.of(blank));

        List<AdminCompanyProfileSummary> pending = adminCompanyService.getPending(null);

        assertThat(pending).isEmpty();
    }

    @Test
    void verifyRejectsIncompleteProfile() {
        User user = companyUser();
        CompanyProfile blank = new CompanyProfile(user.getId(), null, null, null, null, null, null, null, null, null);
        when(companyProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(blank));

        assertThatThrownBy(() -> adminCompanyService.verify(user.getId()))
                .isInstanceOf(CompanyProfileIncompleteException.class);
    }

    @Test
    void getPendingFiltersByCompanyNameEmailOrContactNumber() {
        User vertex = companyUser();
        User orbit = new User("hello@orbitlabs.com", "hash", "Orbit Labs", UserRole.COMPANY);
        CompanyProfile vertexProfile = new CompanyProfile(
                vertex.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address",
                "Signatory", "9876543210", null);
        CompanyProfile orbitProfile = new CompanyProfile(
                orbit.getId(), "Private Limited", "CIN456", "GSTIN456", "PAN456", "Tech", "Address",
                "Signatory", "9123456780", null);
        when(companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING))
                .thenReturn(List.of(vertexProfile, orbitProfile));
        when(userRepository.findById(vertex.getId())).thenReturn(Optional.of(vertex));
        when(userRepository.findById(orbit.getId())).thenReturn(Optional.of(orbit));
        when(companyCertificateService.list(any())).thenReturn(List.of());

        assertThat(adminCompanyService.getPending("orbit")).extracting(AdminCompanyProfileSummary::companyName)
                .containsExactly("Orbit Labs");
        assertThat(adminCompanyService.getPending("founder@vertex.com"))
                .extracting(AdminCompanyProfileSummary::companyName)
                .containsExactly("Vertex Robotics");
        assertThat(adminCompanyService.getPending("9123456780"))
                .extracting(AdminCompanyProfileSummary::companyName)
                .containsExactly("Orbit Labs");
        assertThat(adminCompanyService.getPending("no-match")).isEmpty();
    }
}
