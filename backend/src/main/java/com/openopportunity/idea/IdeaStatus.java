package com.openopportunity.idea;

public enum IdeaStatus {
    /** Awaiting admin moderation — every new/edited idea starts (or returns) here. */
    PENDING,
    /** Admin-approved and publicly visible — not yet client-settable (no admin approval
     * endpoint exists for ideas yet). */
    APPROVED,
    /** Admin-declined — not yet client-settable. */
    REJECTED
}
