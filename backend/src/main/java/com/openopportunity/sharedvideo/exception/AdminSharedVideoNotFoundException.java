package com.openopportunity.sharedvideo.exception;

import java.util.UUID;

public class AdminSharedVideoNotFoundException extends RuntimeException {

    public AdminSharedVideoNotFoundException(UUID videoId) {
        super("Video " + videoId + " not found");
    }
}
