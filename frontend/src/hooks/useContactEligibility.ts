import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { companyApi, type ContactQuota } from '../lib/companyApi'

export type ContactEligibilityReason = 'incomplete-profile' | 'free-plan' | 'quota-exhausted' | null

/** Whether this company can currently use "View contact" / "View profile" on
 * search-candidates and job applicants — combines the pre-existing "complete + verified
 * company profile" gate with the newer billing-plan/contact-quota gate (see
 * CandidateSearchService.requireEligibleToContactCandidates, which enforces the same
 * combination server-side). Shared across SearchCandidatesPage, JobApplicantsPage, and
 * CandidateProfileViewPage rather than duplicating the fetch/combine logic three times. */
export function useContactEligibility() {
  const { t } = useTranslation('company')
  const [canContact, setCanContact] = useState(false)
  const [reason, setReason] = useState<ContactEligibilityReason>(null)
  const [quota, setQuota] = useState<ContactQuota | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([companyApi.getProfile(), companyApi.getContactQuota()])
      .then(([profile, quotaResult]) => {
        if (cancelled) return
        setQuota(quotaResult)
        const profileOk = profile.profileComplete && profile.verificationStatus === 'VERIFIED'
        if (!profileOk) {
          setCanContact(false)
          setReason('incomplete-profile')
        } else if (quotaResult.plan === 'FREE') {
          setCanContact(false)
          setReason('free-plan')
        } else if (quotaResult.remaining <= 0) {
          setCanContact(false)
          setReason('quota-exhausted')
        } else {
          setCanContact(true)
          setReason(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanContact(false)
          setReason(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hint =
    reason === 'incomplete-profile'
      ? t('searchCandidates.contactDisabledHint')
      : reason === 'free-plan'
        ? t('searchCandidates.contactDisabledFreePlan')
        : reason === 'quota-exhausted' && quota
          ? t('searchCandidates.contactDisabledQuotaExhausted', { limit: quota.limit })
          : null

  return { canContact, reason, hint, quota, loading }
}
