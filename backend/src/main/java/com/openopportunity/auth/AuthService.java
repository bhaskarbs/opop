package com.openopportunity.auth;

import com.openopportunity.auth.dto.AuthResponse;
import com.openopportunity.auth.dto.GoogleAuthRequest;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.dto.UserSummary;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.IncompleteCandidateProfileException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import com.openopportunity.auth.exception.SuspendedAccountException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final long refreshTokenExpiryDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            CompanyProfileRepository companyProfileRepository,
            CandidateProfileRepository candidateProfileRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifierService googleTokenVerifierService,
            @Value("${app.jwt.refresh-token-expiry-days}") long refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    /** The raw refresh token is only ever handed to the controller to set as an httpOnly cookie. */
    public record Issued(AuthResponse response, String rawRefreshToken, long refreshTokenExpirySeconds) {}

    @Transactional
    public Issued register(RegisterRequest request) {
        UserRole role = parseRegistrationRole(request.role());
        if (userRepository.existsByEmailAndRole(request.email(), role)) {
            throw new EmailAlreadyRegisteredException(request.email());
        }
        if (role == UserRole.COMPANY) {
            requireCompanyProfileFields(request);
        }
        List<String> cleanedSkills = role == UserRole.CANDIDATE ? cleanSkills(request.skills()) : null;
        if (role == UserRole.CANDIDATE) {
            requireCandidateProfileFields(request, cleanedSkills);
        }

        User user =
                new User(request.email(), passwordEncoder.encode(request.password()), request.fullName(), role);
        userRepository.save(user);

        if (role == UserRole.COMPANY) {
            CompanyProfile profile = new CompanyProfile(
                    user.getId(),
                    request.entityType(),
                    request.cin(),
                    request.gstin(),
                    request.pan(),
                    request.industry(),
                    request.address(),
                    request.signatoryName());
            companyProfileRepository.save(profile);
        }

        if (role == UserRole.CANDIDATE) {
            CandidateProfile profile = new CandidateProfile(
                    user.getId(), request.mobile(), cleanedSkills, request.resumeFileName());
            candidateProfileRepository.save(profile);
        }

        return issueTokens(user);
    }

    @Transactional
    public Issued login(LoginRequest request) {
        UserRole role = parseLoginRole(request.role());
        User user = userRepository
                .findByEmailAndRole(request.email(), role)
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (user.isSuspended()) {
            throw new SuspendedAccountException();
        }
        return issueTokens(user);
    }

    /** Candidate-only: verifies the Google ID token, then either logs into the matching
     * CANDIDATE account or auto-registers a new one (with a blank, fillable-later candidate
     * profile) on first sign-in — mirroring findProfile()'s auto-provisioning elsewhere so a
     * Google sign-in never requires a separate "finish registration" step. Since email is
     * unique per role (see User), this only ever looks at/creates a CANDIDATE row — it's
     * unaffected by, and never conflicts with, a COMPANY account under the same email. */
    @Transactional
    public Issued loginWithGoogle(GoogleAuthRequest request) {
        GoogleTokenVerifierService.VerifiedGoogleUser googleUser =
                googleTokenVerifierService.verify(request.idToken());
        if (!googleUser.emailVerified()) {
            throw new InvalidGoogleTokenException();
        }

        User user = userRepository.findByEmailAndRole(googleUser.email(), UserRole.CANDIDATE).orElse(null);
        if (user == null) {
            String fullName = isNotBlank(googleUser.fullName()) ? googleUser.fullName() : googleUser.email();
            user = new User(googleUser.email(), passwordEncoder.encode(generateRawToken()), fullName, UserRole.CANDIDATE);
            userRepository.save(user);
            candidateProfileRepository.save(new CandidateProfile(user.getId(), "", List.of(), null));
        }

        if (user.isSuspended()) {
            throw new SuspendedAccountException();
        }
        return issueTokens(user);
    }

    /** Company-only: mirrors loginWithGoogle (candidate) — verifies the token, then either
     * logs into the matching COMPANY account or auto-registers a new one on first sign-in.
     * Unlike registration, a Google-created company starts with a blank profile (no CIN/GSTIN/
     * PAN/etc. — Google never supplies those): it can log in and search candidates right away,
     * but posting jobs and contacting candidates require completing the profile via
     * PUT /api/company/profile and then being admin-verified — see JobService.create() and
     * CompanyProfile.isProfileComplete(). */
    @Transactional
    public Issued loginWithGoogleAsCompany(GoogleAuthRequest request) {
        GoogleTokenVerifierService.VerifiedGoogleUser googleUser =
                googleTokenVerifierService.verify(request.idToken());
        if (!googleUser.emailVerified()) {
            throw new InvalidGoogleTokenException();
        }

        User user = userRepository.findByEmailAndRole(googleUser.email(), UserRole.COMPANY).orElse(null);
        if (user == null) {
            String fullName = isNotBlank(googleUser.fullName()) ? googleUser.fullName() : googleUser.email();
            user = new User(googleUser.email(), passwordEncoder.encode(generateRawToken()), fullName, UserRole.COMPANY);
            userRepository.save(user);
            companyProfileRepository.save(new CompanyProfile(user.getId(), null, null, null, null, null, null, null));
        }

        if (user.isSuspended()) {
            throw new SuspendedAccountException();
        }
        return issueTokens(user);
    }

    /** Rotates the refresh token on every use: the presented token is revoked, a new one is issued. */
    @Transactional
    public Issued refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }
        RefreshToken existing = refreshTokenRepository
                .findByTokenHash(hash(rawRefreshToken))
                .filter(RefreshToken::isActive)
                .orElseThrow(InvalidRefreshTokenException::new);
        existing.revoke();
        refreshTokenRepository.save(existing);

        User user =
                userRepository.findById(existing.getUserId()).orElseThrow(InvalidRefreshTokenException::new);
        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(rawRefreshToken)).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    private Issued issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(refreshTokenExpiryDays, ChronoUnit.DAYS);
        refreshTokenRepository.save(new RefreshToken(user.getId(), hash(rawRefreshToken), expiresAt));

        UserSummary summary = new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
        AuthResponse response =
                new AuthResponse(accessToken, "Bearer", jwtService.getAccessTokenExpirySeconds(), summary);
        long refreshTokenExpirySeconds = refreshTokenExpiryDays * 24 * 60 * 60;
        return new Issued(response, rawRefreshToken, refreshTokenExpirySeconds);
    }

    private UserRole parseRegistrationRole(String rawRole) {
        UserRole role;
        try {
            role = UserRole.valueOf(rawRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidRegistrationRoleException(rawRole);
        }
        if (role == UserRole.ADMIN) {
            throw new InvalidRegistrationRoleException(rawRole);
        }
        return role;
    }

    /** Unlike parseRegistrationRole, admin is a valid login role (there's just no admin
     * self-registration). An unrecognized role reads as "no such account" rather than a
     * validation error, matching InvalidCredentialsException's generic non-disclosure. */
    private UserRole parseLoginRole(String rawRole) {
        try {
            return UserRole.valueOf(rawRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidCredentialsException();
        }
    }

    private void requireCompanyProfileFields(RegisterRequest request) {
        boolean complete = isNotBlank(request.entityType())
                && isNotBlank(request.cin())
                && isNotBlank(request.gstin())
                && isNotBlank(request.pan())
                && isNotBlank(request.industry())
                && isNotBlank(request.address())
                && isNotBlank(request.signatoryName());
        if (!complete) {
            throw new IncompleteCompanyProfileException();
        }
    }

    private void requireCandidateProfileFields(RegisterRequest request, List<String> cleanedSkills) {
        boolean complete = isNotBlank(request.mobile()) && !cleanedSkills.isEmpty();
        if (!complete) {
            throw new IncompleteCandidateProfileException();
        }
    }

    private static List<String> cleanSkills(List<String> rawSkills) {
        if (rawSkills == null) {
            return List.of();
        }
        return rawSkills.stream().map(String::trim).filter(AuthService::isNotBlank).toList();
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
