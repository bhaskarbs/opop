-- A company account created via Google sign-in (see AuthService.loginWithGoogleAsCompany)
-- starts with none of these — Google only ever supplies an email and a name, never
-- CIN/GSTIN/PAN/etc. The company fills them in afterwards via PUT /api/company/profile, and
-- only once complete (and admin-verified) can it post jobs or contact candidates — see
-- CompanyProfile.isProfileComplete() and JobService.create().
alter table company_profiles
    alter column entity_type drop not null,
    alter column cin drop not null,
    alter column gstin drop not null,
    alter column pan drop not null,
    alter column industry drop not null,
    alter column address drop not null,
    alter column signatory_name drop not null;
