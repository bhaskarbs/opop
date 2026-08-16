-- Company counterpart to V63 — see that migration's comment. Lets an admin comp grant (see
-- CompanyBillingService.adminSetPlan) skip generating an invoice for a company's Growth period.
alter table company_billing_transactions
    add column invoice_available boolean not null default true;
