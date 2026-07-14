package com.openopportunity.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Verifies the ID token credential Google Identity Services hands back to the frontend's
 * Sign-In-With-Google button. Signature/issuer/expiry/audience checks all happen inside
 * GoogleIdTokenVerifier against Google's published public keys — nothing here trusts the
 * token's claims until that call returns non-null. */
@Service
public class GoogleTokenVerifierService {

    public record VerifiedGoogleUser(String email, boolean emailVerified, String fullName) {}

    private final GoogleIdTokenVerifier verifier;
    private final boolean configured;

    public GoogleTokenVerifierService(@Value("${app.oauth.google.client-id}") String clientId) {
        this.configured = clientId != null && !clientId.isBlank();
        this.verifier = configured
                ? new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(List.of(clientId))
                        .build()
                : null;
    }

    public VerifiedGoogleUser verify(String rawIdToken) {
        if (!configured) {
            throw new IllegalStateException(
                    "Google sign-in is not configured — set APP_OAUTH_GOOGLE_CLIENT_ID");
        }
        GoogleIdToken token;
        try {
            token = verifier.verify(rawIdToken);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException ex) {
            throw new InvalidGoogleTokenException();
        }
        if (token == null) {
            throw new InvalidGoogleTokenException();
        }
        GoogleIdToken.Payload payload = token.getPayload();
        String fullName = (String) payload.get("name");
        return new VerifiedGoogleUser(payload.getEmail(), Boolean.TRUE.equals(payload.getEmailVerified()), fullName);
    }
}
