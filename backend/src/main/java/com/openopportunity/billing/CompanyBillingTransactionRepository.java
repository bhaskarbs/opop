package com.openopportunity.billing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyBillingTransactionRepository extends JpaRepository<CompanyBillingTransaction, UUID> {

    List<CompanyBillingTransaction> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    Optional<CompanyBillingTransaction> findByRazorpayOrderId(String razorpayOrderId);

    /** All-time revenue (see AdminReportsService.getFinancialStats) — coalesced since `sum`
     * returns null, not 0, when no transaction matches. */
    @Query("select coalesce(sum(t.amountRupees), 0) from CompanyBillingTransaction t where t.status = :status")
    long sumAmountRupeesByStatus(@Param("status") TransactionStatus status);
}
