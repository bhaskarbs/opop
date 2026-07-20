package com.openopportunity.billing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingTransactionRepository extends JpaRepository<BillingTransaction, UUID> {

    List<BillingTransaction> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    Optional<BillingTransaction> findByRazorpayOrderId(String razorpayOrderId);
}
