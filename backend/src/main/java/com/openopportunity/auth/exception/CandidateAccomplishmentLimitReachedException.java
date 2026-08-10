package com.openopportunity.auth.exception;

/** Shared across all three accomplishment kinds (work sample, research paper, certification) —
 * kindPlural is a short human-readable label (e.g. "work samples") used to build the message. */
public class CandidateAccomplishmentLimitReachedException extends RuntimeException {

    public CandidateAccomplishmentLimitReachedException(String kindPlural, int limit) {
        super("You've reached the maximum of " + limit + " " + kindPlural
                + ". Delete an existing one to add another.");
    }
}
