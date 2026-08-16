-- Lets an admin comp grant (see CandidateBillingService.adminSetPlan) skip generating an
-- invoice for a candidate's Plus period, distinct from whether the transaction is PAID (which
-- already gates the "Download invoice" button on CandidateBillingPage.tsx). Defaults true so
-- every existing row (real Razorpay payments, free downgrades, and past admin grants, which
-- always got an invoice until now) keeps its current invoice link.
alter table candidate_billing_transactions
    add column invoice_available boolean not null default true;
