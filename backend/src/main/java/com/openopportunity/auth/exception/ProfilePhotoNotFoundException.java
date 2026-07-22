package com.openopportunity.auth.exception;

import java.util.UUID;

public class ProfilePhotoNotFoundException extends RuntimeException {

    public ProfilePhotoNotFoundException(UUID candidateId) {
        super("No profile photo found for candidate " + candidateId);
    }
}
