package com.openopportunity.auth;

import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Self-service counterpart to AdminCompanyService — a company reading/updating its own
 * profile, as opposed to an admin reviewing/verifying someone else's. Company details are set
 * either at registration (see AuthService.register) or, for a Google-signup company that
 * started with a blank profile, via updateProfile below. */
@Service
public class CompanyProfileService {

    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;

    public CompanyProfileService(UserRepository userRepository, CompanyProfileRepository companyProfileRepository) {
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
    }

    @Transactional(readOnly = true)
    public CompanyProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();
        CompanyProfile profile = findProfile(userId);
        return toResponse(user, profile);
    }

    @Transactional
    public CompanyProfileResponse updateProfile(UUID userId, UpdateCompanyProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow();
        CompanyProfile profile = findProfile(userId);
        profile.updateDetails(
                request.entityType(),
                request.cin(),
                request.gstin(),
                request.pan(),
                request.industry(),
                request.address(),
                request.signatoryName());
        companyProfileRepository.save(profile);
        return toResponse(user, profile);
    }

    private CompanyProfile findProfile(UUID userId) {
        return companyProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new CompanyProfileNotFoundException(userId));
    }

    private CompanyProfileResponse toResponse(User user, CompanyProfile profile) {
        return new CompanyProfileResponse(
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
                profile.isProfileComplete());
    }
}
