package com.openopportunity.auth.exception;

import java.util.UUID;

/** Shared across all three accomplishment kinds (work sample, research paper, certification) —
 * kind is a short human-readable label (e.g. "Work sample") used to build the message. */
public class CandidateAccomplishmentNotFoundException extends RuntimeException {

    public CandidateAccomplishmentNotFoundException(String kind, UUID id) {
        super(kind + " " + id + " not found");
    }
}
