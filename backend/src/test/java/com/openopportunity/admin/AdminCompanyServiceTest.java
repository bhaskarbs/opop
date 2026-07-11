package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
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

    private AdminCompanyService adminCompanyService;

    @BeforeEach
    void setUp() {
        adminCompanyService = new AdminCompanyService(companyProfileRepository, userRepository);
    }

    private User companyUser() {
        return new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
    }

    @Test
    void getPendingReturnsOnlyPendingProfiles() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory");
        when(companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING))
                .thenReturn(List.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        List<AdminCompanyProfileSummary> pending = adminCompanyService.getPending();

        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).companyName()).isEqualTo("Vertex Robotics");
        assertThat(pending.get(0).verificationStatus()).isEqualTo(VerificationStatus.PENDING);
    }

    @Test
    void verifySetsStatusToVerified() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory");
        when(companyProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AdminCompanyProfileSummary summary = adminCompanyService.verify(user.getId());

        assertThat(summary.verificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
    }

    @Test
    void rejectSetsStatusToRejected() {
        User user = companyUser();
        CompanyProfile profile = new CompanyProfile(
                user.getId(), "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory");
        when(companyProfileRepository.findByUserId(user.getId())).thenReturn(Optional.of(profile));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AdminCompanyProfileSummary summary = adminCompanyService.reject(user.getId());

        assertThat(summary.verificationStatus()).isEqualTo(VerificationStatus.REJECTED);
    }

    @Test
    void verifyRejectsMissingProfile() {
        when(companyProfileRepository.findByUserId(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminCompanyService.verify(UUID.randomUUID()))
                .isInstanceOf(CompanyProfileNotFoundException.class);
    }
}
