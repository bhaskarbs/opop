package com.openopportunity.auth;

import com.openopportunity.auth.dto.AuthResponse;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.dto.UserSummary;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTokenExpiryDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.jwt.refresh-token-expiry-days}") long refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    /** The raw refresh token is only ever handed to the controller to set as an httpOnly cookie. */
    public record Issued(AuthResponse response, String rawRefreshToken, long refreshTokenExpirySeconds) {}

    @Transactional
    public Issued register(RegisterRequest request) {
        UserRole role = parseRegistrationRole(request.role());
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyRegisteredException(request.email());
        }
        User user =
                new User(request.email(), passwordEncoder.encode(request.password()), request.fullName(), role);
        userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public Issued login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email()).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
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
