import { useEffect } from 'react'
import { useCandidateProfileStore } from '../stores/candidateProfileStore'
import { useAuthStore } from '../stores/authStore'

/** Fetches the candidate's profile photo once when a layout needing the header's avatar mounts
 * for a candidate session — both AuthenticatedLayout and PublicLayout call this, since a
 * candidate can land on either first (e.g. straight to /jobs before ever visiting their
 * dashboard/profile page). Goes through candidateProfileStore's cache-first fetchProfile
 * (see there) rather than calling candidateApi.getProfile() directly, so this never triggers a
 * network request if some other candidate page already loaded the profile this session — and
 * CandidateProfilePage keeps the store in sync afterwards via setCandidatePhoto directly (see
 * there), so this never needs to run again mid-session either. */
export function useCandidatePhotoSync(isCandidate: boolean) {
  const candidatePhotoUrl = useAuthStore((state) => state.candidatePhotoUrl)
  const candidatePhotoVersion = useAuthStore((state) => state.candidatePhotoVersion)
  const setCandidatePhoto = useAuthStore((state) => state.setCandidatePhoto)
  const fetchProfile = useCandidateProfileStore((state) => state.fetchProfile)

  useEffect(() => {
    if (!isCandidate) return
    let cancelled = false
    fetchProfile()
      .then((profile) => {
        if (!cancelled) setCandidatePhoto(profile.photoUrl)
      })
      .catch(() => {
        // Best-effort — the header just falls back to initials if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [isCandidate, setCandidatePhoto, fetchProfile])

  return { candidatePhotoUrl, candidatePhotoVersion }
}
