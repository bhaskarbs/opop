package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.GoogleAuthRequest;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.GoogleAccountRoleConflictException;
import com.openopportunity.auth.exception.IncompleteCandidateProfileException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private GoogleTokenVerifierService googleTokenVerifierService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                companyProfileRepository,
                candidateProfileRepository,
                passwordEncoder,
                jwtService,
                googleTokenVerifierService,
                30);
    }

    private static RegisterRequest candidateRequest() {
        return new RegisterRequest(
                "rohan@example.com",
                "password123",
                "Rohan Mehta",
                "candidate",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "9876543210",
                List.of("React", "TypeScript"),
                null);
    }

    @Test
    void registerCreatesCandidateAndIssuesTokens() {
        RegisterRequest request = candidateRequest();
        when(userRepository.existsByEmail("rohan@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(jwtService.generateAccessToken(any())).thenReturn("access-token");
        when(jwtService.getAccessTokenExpirySeconds()).thenReturn(900L);

        AuthService.Issued issued = authService.register(request);

        assertThat(issued.response().accessToken()).isEqualTo("access-token");
        assertThat(issued.response().user().email()).isEqualTo("rohan@example.com");
        assertThat(issued.response().user().role()).isEqualTo(UserRole.CANDIDATE);
        assertThat(issued.rawRefreshToken()).isNotBlank();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("hashed");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest("rohan@example.com", "password123", "Rohan Mehta", "candidate");
        when(userRepository.existsByEmail("rohan@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request)).isInstanceOf(EmailAlreadyRegisteredException.class);
    }

    @Test
    void registerRejectsCandidateMissingMobileOrSkills() {
        RegisterRequest request = new RegisterRequest(
                "rohan@example.com",
                "password123",
                "Rohan Mehta",
                "candidate",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null);
        when(userRepository.existsByEmail("rohan@example.com")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(request)).isInstanceOf(IncompleteCandidateProfileException.class);
    }

    @Test
    void registerRejectsAdminRole() {
        RegisterRequest request = new RegisterRequest("rohan@example.com", "password123", "Rohan Mehta", "admin");

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRegistrationRoleException.class);
    }

    @Test
    void registerRejectsUnknownRole() {
        RegisterRequest request = new RegisterRequest("rohan@example.com", "password123", "Rohan Mehta", "manager");

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRegistrationRoleException.class);
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        User user = new User("rohan@example.com", "hashed", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findByEmail("rohan@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.getAccessTokenExpirySeconds()).thenReturn(900L);

        AuthService.Issued issued = authService.login(new LoginRequest("rohan@example.com", "password123"));

        assertThat(issued.response().accessToken()).isEqualTo("access-token");
    }

    @Test
    void loginFailsWithWrongPassword() {
        User user = new User("rohan@example.com", "hashed", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findByEmail("rohan@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("rohan@example.com", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void loginFailsForUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "password123")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void refreshRejectsUnknownToken() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("some-raw-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refreshRejectsExpiredToken() {
        RefreshToken expired = new RefreshToken(UUID.randomUUID(), "irrelevant-hash", Instant.now().minusSeconds(60));
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh("some-raw-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refreshRejectsBlankOrMissingToken() {
        assertThatThrownBy(() -> authService.refresh(" ")).isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> authService.refresh(null)).isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void loginWithGoogleAutoRegistersNewCandidate() {
        when(googleTokenVerifierService.verify("google-id-token"))
                .thenReturn(new GoogleTokenVerifierService.VerifiedGoogleUser(
                        "rohan@example.com", true, "Rohan Mehta"));
        when(userRepository.findByEmail("rohan@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(jwtService.generateAccessToken(any())).thenReturn("access-token");
        when(jwtService.getAccessTokenExpirySeconds()).thenReturn(900L);

        AuthService.Issued issued = authService.loginWithGoogle(new GoogleAuthRequest("google-id-token"));

        assertThat(issued.response().user().email()).isEqualTo("rohan@example.com");
        assertThat(issued.response().user().role()).isEqualTo(UserRole.CANDIDATE);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getFullName()).isEqualTo("Rohan Mehta");
        verify(candidateProfileRepository).save(any(CandidateProfile.class));
    }

    @Test
    void loginWithGoogleLogsInExistingCandidate() {
        User user = new User("rohan@example.com", "hashed", "Rohan Mehta", UserRole.CANDIDATE);
        when(googleTokenVerifierService.verify("google-id-token"))
                .thenReturn(new GoogleTokenVerifierService.VerifiedGoogleUser(
                        "rohan@example.com", true, "Rohan Mehta"));
        when(userRepository.findByEmail("rohan@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.getAccessTokenExpirySeconds()).thenReturn(900L);

        AuthService.Issued issued = authService.loginWithGoogle(new GoogleAuthRequest("google-id-token"));

        assertThat(issued.response().accessToken()).isEqualTo("access-token");
        verify(userRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void loginWithGoogleRejectsUnverifiedEmail() {
        when(googleTokenVerifierService.verify("google-id-token"))
                .thenReturn(new GoogleTokenVerifierService.VerifiedGoogleUser(
                        "rohan@example.com", false, "Rohan Mehta"));

        assertThatThrownBy(() -> authService.loginWithGoogle(new GoogleAuthRequest("google-id-token")))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void loginWithGoogleRejectsNonCandidateAccount() {
        User company = new User("acme@example.com", "hashed", "Acme Inc", UserRole.COMPANY);
        when(googleTokenVerifierService.verify("google-id-token"))
                .thenReturn(new GoogleTokenVerifierService.VerifiedGoogleUser("acme@example.com", true, "Acme Inc"));
        when(userRepository.findByEmail("acme@example.com")).thenReturn(Optional.of(company));

        assertThatThrownBy(() -> authService.loginWithGoogle(new GoogleAuthRequest("google-id-token")))
                .isInstanceOf(GoogleAccountRoleConflictException.class);
    }
}
