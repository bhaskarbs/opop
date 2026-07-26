package com.openopportunity.billing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyBillingTransactionRepository extends JpaRepository<CompanyBillingTransaction, UUID> {

    List<CompanyBillingTransaction> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    Optional<CompanyBillingTransaction> findByRazorpayOrderId(String razorpayOrderId);
}
