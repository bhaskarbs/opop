package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import com.openopportunity.admin.exception.CompanyProfileIncompleteException;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.VerificationStatus;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminCompanyService {

    private final CompanyProfileRepository companyProfileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public AdminCompanyService(
            CompanyProfileRepository companyProfileRepository,
            UserRepository userRepository,
            NotificationService notificationService) {
        this.companyProfileRepository = companyProfileRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<AdminCompanyProfileSummary> getPending() {
        // A Google-signup company (see AuthService.loginWithGoogleAsCompany) starts PENDING
        // with every one of these fields blank — there's nothing for an admin to review until
        // the company fills them in via PUT /api/company/profile, so it's excluded from the
        // queue until then rather than showing up as a row of blanks.
        return companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING)
                .stream()
                .filter(CompanyProfile::isProfileComplete)
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public AdminCompanyProfileSummary verify(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElseThrow(
                () -> new CompanyProfileNotFoundException(userId));
        if (!profile.isProfileComplete()) {
            throw new CompanyProfileIncompleteException();
        }
        profile.verify();
        companyProfileRepository.save(profile);
        notificationService.notify(
                userId,
                NotificationType.COMPANY_VERIFIED,
                "Your company profile has been verified. You can now post jobs and partnerships.",
                "/company/profile");
        return toSummary(profile);
    }

    @Transactional
    public AdminCompanyProfileSummary reject(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElseThrow(
                () -> new CompanyProfileNotFoundException(userId));
        profile.reject();
        companyProfileRepository.save(profile);
        notificationService.notify(
                userId,
                NotificationType.COMPANY_REJECTED,
                "Your company profile verification was rejected. Please review and update your details.",
                "/company/profile");
        return toSummary(profile);
    }

    private AdminCompanyProfileSummary toSummary(CompanyProfile profile) {
        User user = userRepository.findById(profile.getUserId()).orElseThrow();
        return new AdminCompanyProfileSummary(
                profile.getUserId(),
                user.getFullName(),
                user.getEmail(),
                profile.getEntityType(),
                profile.getCin(),
                profile.getGstin(),
                profile.getPan(),
                profile.getIndustry(),
                profile.getAddress(),
                profile.getSignatoryName(),
                profile.getVerificationStatus(),
                profile.getCreatedAt());
    }
}
