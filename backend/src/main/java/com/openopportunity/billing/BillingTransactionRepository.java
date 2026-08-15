package com.openopportunity.billing;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BillingTransactionRepository extends JpaRepository<BillingTransaction, UUID> {

    List<BillingTransaction> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    Optional<BillingTransaction> findByRazorpayOrderId(String razorpayOrderId);

    /** All-time revenue (see AdminReportsService.getFinancialStats) — coalesced since `sum`
     * returns null, not 0, when no transaction matches. */
    @Query("select coalesce(sum(t.amountRupees), 0) from BillingTransaction t where t.status = :status")
    long sumAmountRupeesByStatus(@Param("status") TransactionStatus status);

    /** Date-bounded counterpart of sumAmountRupeesByStatus, for AdminReportsService's
     * date-range dropdown — revenue recorded (paid) within the window, not all-time. */
    @Query(
            "select coalesce(sum(t.amountRupees), 0) from BillingTransaction t "
                    + "where t.status = :status and t.createdAt > :since")
    long sumAmountRupeesByStatusAndCreatedAtAfter(
            @Param("status") TransactionStatus status, @Param("since") Instant since);

    /** Every FREE-plan transaction represents a downgrade event (self-service, admin comp, or
     * the daily expiry sweep) — there's no "joined on Free" transaction since rows are only
     * created on an actual plan change (see AdminBillingService's "churned this month"). */
    long countByPlanAndCreatedAtBetween(SubscriptionPlan plan, Instant start, Instant end);

    List<BillingTransaction> findAllByOrderByCreatedAtDesc();

    // Used only by admin hard-delete (AdminAccountDeletionService#deleteCandidate) — billing
    // history has no DB-level FK to users, so this cleanup is entirely application-managed.
    void deleteByCandidateId(UUID candidateId);
}
