-- A checkout-initiated transaction now starts PENDING (a real Razorpay Order was created but not
-- necessarily paid yet) rather than always being an instantly-successful mock, so PAID is no
-- longer the only possible status.
alter table candidate_billing_transactions
    drop constraint candidate_billing_transactions_status_check,
    add constraint candidate_billing_transactions_status_check
        check (status in ('PENDING', 'PAID', 'FAILED')),
    add column razorpay_order_id varchar(64),
    add column razorpay_payment_id varchar(64);

-- Idempotency guard: a retried webhook trying to mark the same payment PAID a second time hits
-- this constraint, which CandidateBillingService treats as "already processed" rather than
-- inserting/updating a duplicate.
create unique index uq_candidate_billing_transactions_razorpay_payment_id
    on candidate_billing_transactions (razorpay_payment_id)
    where razorpay_payment_id is not null;
