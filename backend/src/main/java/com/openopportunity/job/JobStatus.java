package com.openopportunity.job;

public enum JobStatus {
    DRAFT,
    /** Submitted by the company, awaiting admin moderation — not client-settable directly. */
    PENDING_APPROVAL,
    /** Admin-approved and publicly visible — only reachable via the admin approve action. */
    ACTIVE,
    /** Admin-declined — only reachable via the admin reject action. */
    REJECTED,
    CLOSED
}
