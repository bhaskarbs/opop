package com.openopportunity.auth;

import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.auth.dto.CompanyProfileResponse;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only self-service counterpart to AdminCompanyService — a company fetching its own
 * profile, as opposed to an admin reviewing/verifying someone else's. No edit endpoints exist
 * here yet; company details are only ever set at registration (see AuthService). */
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
        CompanyProfile profile = companyProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new CompanyProfileNotFoundException(userId));
        return new CompanyProfileResponse(
                user.getFullName(),
                user.getEmail(),
                profile.getEntityType(),
                profile.getIndustry(),
                profile.getVerificationStatus());
    }
}
