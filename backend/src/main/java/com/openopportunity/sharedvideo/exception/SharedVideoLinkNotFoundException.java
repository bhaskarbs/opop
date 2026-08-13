package com.openopportunity.sharedvideo.exception;

/** A public-facing 404 — deliberately doesn't distinguish "token never existed" from "token
 * existed but its video was deleted", since a stranger probing this endpoint shouldn't be able
 * to tell the difference either way. */
public class SharedVideoLinkNotFoundException extends RuntimeException {

    public SharedVideoLinkNotFoundException() {
        super("This link is invalid or has expired");
    }
}
