package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import java.time.Instant;
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
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService, 30);
    }

    @Test
    void registerCreatesCandidateAndIssuesTokens() {
        RegisterRequest request = new RegisterRequest("rohan@example.com", "password123", "Rohan Mehta", "candidate");
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
}
