import { useEffect } from 'react'
import { candidateApi } from '../lib/candidateApi'
import { useAuthStore } from '../stores/authStore'

/** Fetches the candidate's profile photo once when a layout needing the header's avatar mounts
 * for a candidate session — both AuthenticatedLayout and PublicLayout call this, since a
 * candidate can land on either first (e.g. straight to /jobs before ever visiting their
 * dashboard/profile page). CandidateProfilePage keeps the store in sync afterwards via
 * setCandidatePhoto directly (see there), so this never needs to run again mid-session. */
export function useCandidatePhotoSync(isCandidate: boolean) {
  const candidatePhotoUrl = useAuthStore((state) => state.candidatePhotoUrl)
  const candidatePhotoVersion = useAuthStore((state) => state.candidatePhotoVersion)
  const setCandidatePhoto = useAuthStore((state) => state.setCandidatePhoto)

  useEffect(() => {
    if (!isCandidate) return
    let cancelled = false
    candidateApi
      .getProfile()
      .then((profile) => {
        if (!cancelled) setCandidatePhoto(profile.photoUrl)
      })
      .catch(() => {
        // Best-effort — the header just falls back to initials if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [isCandidate, setCandidatePhoto])

  return { candidatePhotoUrl, candidatePhotoVersion }
}
