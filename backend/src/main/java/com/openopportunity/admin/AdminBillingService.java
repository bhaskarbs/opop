package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminBillingStats;
import com.openopportunity.admin.dto.AdminInvoiceSummary;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.BillingTransaction;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingTransaction;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.CompanySubscription;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.billing.SubscriptionPlan;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Combines the separate candidate/company billing tables into the single view the admin
 * billing page needs — neither CandidateBillingService nor CompanyBillingService owns this on
 * its own, same reasoning as AdminReportsService.getFinancialStats pulling from both. */
@Service
public class AdminBillingService {

    private final UserRepository userRepository;
    private final CandidateSubscriptionRepository candidateSubscriptionRepository;
    private final CompanySubscriptionRepository companySubscriptionRepository;
    private final BillingTransactionRepository candidateTransactionRepository;
    private final CompanyBillingTransactionRepository companyTransactionRepository;

    public AdminBillingService(
            UserRepository userRepository,
            CandidateSubscriptionRepository candidateSubscriptionRepository,
            CompanySubscriptionRepository companySubscriptionRepository,
            BillingTransactionRepository candidateTransactionRepository,
            CompanyBillingTransactionRepository companyTransactionRepository) {
        this.userRepository = userRepository;
        this.candidateSubscriptionRepository = candidateSubscriptionRepository;
        this.companySubscriptionRepository = companySubscriptionRepository;
        this.candidateTransactionRepository = candidateTransactionRepository;
        this.companyTransactionRepository = companyTransactionRepository;
    }

    @Transactional(readOnly = true)
    public AdminBillingStats getStats() {
        Instant now = Instant.now();
        List<CandidateSubscription> activeCandidates =
                candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(SubscriptionPlan.FREE, now);
        List<CompanySubscription> activeCompanies = companySubscriptionRepository
                .findByPlanNotAndCurrentPeriodEndAfter(CompanySubscriptionPlan.FREE, now);

        long mrr = activeCandidates.stream().mapToLong(sub -> sub.getPlan().getAmountRupees()).sum()
                + activeCompanies.stream().mapToLong(sub -> sub.getPlan().getAmountRupees()).sum();
        long activeSubscriptions = activeCandidates.size() + activeCompanies.size();

        Instant startOfMonth = startOfCurrentMonth();
        long churnedThisMonth =
                candidateTransactionRepository.countByPlanAndCreatedAtBetween(SubscriptionPlan.FREE, startOfMonth, now)
                        + companyTransactionRepository.countByPlanAndCreatedAtBetween(
                                CompanySubscriptionPlan.FREE, startOfMonth, now);

        return new AdminBillingStats(mrr, activeSubscriptions, churnedThisMonth);
    }

    @Transactional(readOnly = true)
    public List<AdminInvoiceSummary> getInvoiceHistory() {
        Stream<AdminInvoiceSummary> candidateInvoices =
                candidateTransactionRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toCandidateInvoice);
        Stream<AdminInvoiceSummary> companyInvoices =
                companyTransactionRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toCompanyInvoice);
        return Stream.concat(candidateInvoices, companyInvoices)
                .sorted(Comparator.comparing(AdminInvoiceSummary::createdAt).reversed())
                .toList();
    }

    private AdminInvoiceSummary toCandidateInvoice(BillingTransaction transaction) {
        return new AdminInvoiceSummary(
                transaction.getId(),
                nameFor(transaction.getCandidateId()),
                UserRole.CANDIDATE,
                capitalize(transaction.getPlan().name()),
                transaction.getAmountRupees(),
                transaction.getStatus(),
                transaction.getCreatedAt());
    }

    private AdminInvoiceSummary toCompanyInvoice(CompanyBillingTransaction transaction) {
        return new AdminInvoiceSummary(
                transaction.getId(),
                nameFor(transaction.getCompanyId()),
                UserRole.COMPANY,
                capitalize(transaction.getPlan().name()),
                transaction.getAmountRupees(),
                transaction.getStatus(),
                transaction.getCreatedAt());
    }

    private String nameFor(UUID userId) {
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private static String capitalize(String enumName) {
        return enumName.charAt(0) + enumName.substring(1).toLowerCase();
    }

    private static Instant startOfCurrentMonth() {
        return LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
