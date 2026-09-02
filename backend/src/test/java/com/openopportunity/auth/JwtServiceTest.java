package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-that-is-at-least-32-bytes-long!!";

    private final JwtService jwtService = new JwtService(SECRET, 15);

    @Test
    void generatesAndParsesAccessToken() {
        User user = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);

        String token = jwtService.generateAccessToken(user);
        Claims claims = jwtService.parseAndValidate(token);

        assertThat(jwtService.extractUserId(claims)).isEqualTo(user.getId());
        assertThat(jwtService.extractRole(claims)).isEqualTo(UserRole.CANDIDATE);
        assertThat(claims.get("email", String.class)).isEqualTo("rohan@example.com");
    }

    @Test
    void rejectsTamperedToken() {
        User user = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        String token = jwtService.generateAccessToken(user);
        // Flip the payload segment's first character rather than the token's last 2 -- a
        // 32-byte HMAC signature base64url-encodes to 43 chars, and the trailing char only
        // carries 4 of its 6 bits as real signature data (2 are unused padding bits), so
        // overwriting the last 2 chars with a fixed literal could coincidentally decode to the
        // same signature bytes for some randomly generated user ids, making this test flaky
        // (confirmed via a CI failure). The first character of any base64url segment is never
        // subject to that padding ambiguity, so flipping it always changes the signed payload
        // and deterministically invalidates the signature.
        int payloadStart = token.indexOf('.') + 1;
        char flipped = token.charAt(payloadStart) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, payloadStart) + flipped + token.substring(payloadStart + 1);

        assertThatThrownBy(() -> jwtService.parseAndValidate(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        JwtService otherService = new JwtService("a-completely-different-secret-key-32-bytes-plus", 15);
        User user = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        String token = otherService.generateAccessToken(user);

        assertThatThrownBy(() -> jwtService.parseAndValidate(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsExpiredToken() {
        JwtService alreadyExpired = new JwtService(SECRET, -1);
        User user = new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        String token = alreadyExpired.generateAccessToken(user);

        assertThatThrownBy(() -> alreadyExpired.parseAndValidate(token)).isInstanceOf(ExpiredJwtException.class);
    }
}
