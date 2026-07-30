package com.openopportunity.admin.dto;

import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.TransactionStatus;
import java.time.Instant;
import java.util.UUID;

/** One candidate or company billing transaction, for the admin billing page's combined invoice
 * history (see AdminBillingService). plan is a display string (e.g. "Plus", "Enterprise") since
 * candidate and company plans are different enums. */
public record AdminInvoiceSummary(
        UUID id,
        String name,
        UserRole userType,
        String plan,
        long amountRupees,
        TransactionStatus status,
        Instant createdAt) {}
