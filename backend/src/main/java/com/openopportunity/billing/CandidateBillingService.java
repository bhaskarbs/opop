package com.openopportunity.billing;

import com.openopportunity.billing.dto.BillingTransactionSummary;
import com.openopportunity.billing.dto.CandidateBillingSummary;
import com.openopportunity.billing.exception.SamePlanException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** No real payment gateway exists in this phase (see docs/DEVELOPMENT_ROADMAP.md) — changePlan
 * is the entire upgrade/downgrade flow, recording an immediately-successful mock transaction. */
@Service
public class CandidateBillingService {

    private final CandidateSubscriptionRepository subscriptionRepository;
    private final BillingTransactionRepository transactionRepository;

    public CandidateBillingService(
            CandidateSubscriptionRepository subscriptionRepository,
            BillingTransactionRepository transactionRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public CandidateBillingSummary getBilling(UUID candidateId) {
        return new CandidateBillingSummary(currentPlan(candidateId), getHistory(candidateId));
    }

    @Transactional
    public CandidateBillingSummary changePlan(UUID candidateId, SubscriptionPlan plan) {
        SubscriptionPlan existingPlan = currentPlan(candidateId);
        if (existingPlan == plan) {
            throw new SamePlanException();
        }

        CandidateSubscription subscription = subscriptionRepository
                .findByCandidateId(candidateId)
                .orElseGet(() -> new CandidateSubscription(candidateId, plan));
        subscription.changePlan(plan);
        subscriptionRepository.save(subscription);

        transactionRepository.save(new BillingTransaction(candidateId, plan));

        return new CandidateBillingSummary(plan, getHistory(candidateId));
    }

    private SubscriptionPlan currentPlan(UUID candidateId) {
        return subscriptionRepository
                .findByCandidateId(candidateId)
                .map(CandidateSubscription::getPlan)
                .orElse(SubscriptionPlan.FREE);
    }

    private List<BillingTransactionSummary> getHistory(UUID candidateId) {
        return transactionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    private BillingTransactionSummary toSummary(BillingTransaction transaction) {
        return new BillingTransactionSummary(
                transaction.getId(),
                transaction.getPlan(),
                transaction.getAmountRupees(),
                transaction.getStatus(),
                transaction.getCreatedAt());
    }
}
