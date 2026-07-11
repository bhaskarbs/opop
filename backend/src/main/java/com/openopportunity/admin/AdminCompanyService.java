package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.VerificationStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminCompanyService {

    private final CompanyProfileRepository companyProfileRepository;
    private final UserRepository userRepository;

    public AdminCompanyService(CompanyProfileRepository companyProfileRepository, UserRepository userRepository) {
        this.companyProfileRepository = companyProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminCompanyProfileSummary> getPending() {
        return companyProfileRepository.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.PENDING)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public AdminCompanyProfileSummary verify(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElseThrow(
                () -> new CompanyProfileNotFoundException(userId));
        profile.verify();
        companyProfileRepository.save(profile);
        return toSummary(profile);
    }

    @Transactional
    public AdminCompanyProfileSummary reject(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElseThrow(
                () -> new CompanyProfileNotFoundException(userId));
        profile.reject();
        companyProfileRepository.save(profile);
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
