package com.openopportunity.billing;

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
}
