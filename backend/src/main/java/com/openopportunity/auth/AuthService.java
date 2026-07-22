package com.openopportunity.auth;

import com.openopportunity.auth.dto.AuthResponse;
import com.openopportunity.auth.dto.ForgotPasswordRequest;
import com.openopportunity.auth.dto.GoogleAuthRequest;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.dto.ResetPasswordRequest;
import com.openopportunity.auth.dto.UserSummary;
import com.openopportunity.auth.dto.VerifyEmailRequest;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.EmailVerificationEmailException;
import com.openopportunity.auth.exception.IncompleteCandidateProfileException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import com.openopportunity.auth.exception.InvalidOrExpiredResetTokenException;
import com.openopportunity.auth.exception.InvalidOrExpiredVerificationTokenException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import com.openopportunity.auth.exception.PasswordResetEmailException;
import com.openopportunity.auth.exception.SuspendedAccountException;
import com.openopportunity.settings.PlatformSettingsService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    // Reset links are single-use and short-lived on purpose — long enough for someone to check
    // their inbox, short enough that a leaked-but-unused link stops being useful quickly.
    private static final long RESET_TOKEN_EXPIRY_MINUTES = 60;
    // Verification links get a longer window than reset links — there's no urgency to force
    // (unlike a password reset, nobody's locked out while waiting), just an inbox to check.
    private static final long VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PlatformSettingsService platformSettingsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final JavaMailSender mailSender;
    private final long refreshTokenExpiryDays;
    private final String mailFromAddress;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            CompanyProfileRepository companyProfileRepository,
            CandidateProfileRepository candidateProfileRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            PlatformSettingsService platformSettingsService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifierService googleTokenVerifierService,
            JavaMailSender mailSender,
            @Value("${app.jwt.refresh-token-expiry-days}") long refreshTokenExpiryDays,
            @Value("${app.mail.from}") String mailFromAddress,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.platformSettingsService = platformSettingsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.mailSender = mailSender;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
        this.mailFromAddress = mailFromAddress;
        this.frontendBaseUrl = frontendBaseUrl;
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

        boolean requireEmailVerification =
                role == UserRole.CANDIDATE && platformSettingsService.isEmailVerificationEnabled();

        User user =
                new User(request.email(), passwordEncoder.encode(request.password()), request.fullName(), role);
        if (requireEmailVerification) {
            user.markEmailUnverified();
        }
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

            if (requireEmailVerification) {
                // Best-effort — a candidate whose verification email doesn't go out (SMTP
                // hiccup, no credentials configured locally) still gets an account; they can
                // retry via "Resend verification email" (see resendVerificationEmail), which
                // does propagate a failure since that's an explicit user-initiated retry rather
                // than registration itself.
                String rawToken = createVerificationToken(user);
                try {
                    mailSender.send(verificationEmailMessage(user, rawToken));
                } catch (MailException ignored) {
                    // See comment above.
                }
            }
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

    /** Always succeeds from the caller's point of view whether or not the email/role pair
     * matches an account — the controller returns 204 either way (see AuthController) so a
     * response can't be used to enumerate registered emails. An unrecognized role is treated
     * the same as "no such account" for the same reason. */
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        UserRole role;
        try {
            role = UserRole.valueOf(request.role().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return;
        }
        User user = userRepository.findByEmailAndRole(request.email(), role).orElse(null);
        if (user == null) {
            return;
        }

        String rawToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(RESET_TOKEN_EXPIRY_MINUTES, ChronoUnit.MINUTES);
        passwordResetTokenRepository.save(new PasswordResetToken(user.getId(), hash(rawToken), expiresAt));

        // No stored locale preference to route to — defaults to /en (see DEFAULT_LANGUAGE on
        // the frontend); a candidate who prefers Hindi still lands on a working page, just in
        // English.
        String resetLink = frontendBaseUrl + "/en/reset-password?token=" + rawToken;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Reset your OpenOpportunity password");
        message.setText(
                "We received a request to reset your OpenOpportunity password.\n\n"
                        + "Reset it here (link expires in 1 hour): " + resetLink + "\n\n"
                        + "If you didn't request this, you can safely ignore this email.");
        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new PasswordResetEmailException(e);
        }
    }

    /** Consumes the token, updates the password, and revokes every active session for the
     * account — a password reset should log the candidate out everywhere else too. */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHash(hash(request.token()))
                .filter(PasswordResetToken::isActive)
                .orElseThrow(InvalidOrExpiredResetTokenException::new);

        User user = userRepository
                .findById(resetToken.getUserId())
                .orElseThrow(InvalidOrExpiredResetTokenException::new);
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        resetToken.markUsed();
        passwordResetTokenRepository.save(resetToken);

        List<RefreshToken> activeSessions = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(user.getId());
        activeSessions.forEach(RefreshToken::revoke);
        refreshTokenRepository.saveAll(activeSessions);
    }

    /** Authenticated action (the caller is always the account owner — see AuthController) so,
     * unlike requestPasswordReset, there's no email/role ambiguity or enumeration concern to
     * design around. A no-op if the account is already verified. */
    @Transactional
    public void resendVerificationEmail(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (user.isEmailVerified()) {
            return;
        }
        String rawToken = createVerificationToken(user);
        try {
            mailSender.send(verificationEmailMessage(user, rawToken));
        } catch (MailException e) {
            throw new EmailVerificationEmailException(e);
        }
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        EmailVerificationToken token = emailVerificationTokenRepository
                .findByTokenHash(hash(request.token()))
                .filter(EmailVerificationToken::isActive)
                .orElseThrow(InvalidOrExpiredVerificationTokenException::new);

        User user = userRepository
                .findById(token.getUserId())
                .orElseThrow(InvalidOrExpiredVerificationTokenException::new);
        user.markEmailVerified();
        userRepository.save(user);

        token.markUsed();
        emailVerificationTokenRepository.save(token);
    }

    private String createVerificationToken(User user) {
        String rawToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);
        emailVerificationTokenRepository.save(new EmailVerificationToken(user.getId(), hash(rawToken), expiresAt));
        return rawToken;
    }

    private SimpleMailMessage verificationEmailMessage(User user, String rawToken) {
        // No stored locale preference to route to — defaults to /en, same as the password reset
        // link (see requestPasswordReset).
        String verifyLink = frontendBaseUrl + "/en/verify-email?token=" + rawToken;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Verify your OpenOpportunity email");
        message.setText(
                "Welcome to OpenOpportunity! Verify your email to start applying to jobs, partnerships, "
                        + "and community roles.\n\n"
                        + "Verify it here (link expires in 24 hours): " + verifyLink);
        return message;
    }

    private Issued issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(refreshTokenExpiryDays, ChronoUnit.DAYS);
        refreshTokenRepository.save(new RefreshToken(user.getId(), hash(rawRefreshToken), expiresAt));

        UserSummary summary = new UserSummary(
                user.getId(), user.getEmail(), user.getFullName(), user.getRole(), user.isEmailVerified());
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
