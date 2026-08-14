package com.openopportunity.sharedvideo.exception;

import java.util.UUID;

public class AdminVideoShareNotFoundException extends RuntimeException {

    public AdminVideoShareNotFoundException(UUID shareId) {
        super("Share " + shareId + " not found");
    }
}
