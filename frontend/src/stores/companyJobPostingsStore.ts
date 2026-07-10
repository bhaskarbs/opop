import { create } from 'zustand'

export type PostingStatus = 'Active' | 'Draft'

export interface JobPosting {
  id: string
  title: string
  applicants: number
  postedLabel: string
  status: PostingStatus
}

const INITIAL_POSTINGS: JobPosting[] = [
  {
    id: 'posting-1',
    title: 'Frontend Engineer',
    applicants: 128,
    postedLabel: '3 days ago',
    status: 'Active',
  },
  {
    id: 'posting-2',
    title: 'Product Designer',
    applicants: 74,
    postedLabel: '1 week ago',
    status: 'Active',
  },
  {
    id: 'posting-3',
    title: 'Hardware QA Lead',
    applicants: 41,
    postedLabel: '2 weeks ago',
    status: 'Active',
  },
]

interface CompanyJobPostingsState {
  postings: JobPosting[]
  addPosting: (title: string, status: PostingStatus) => void
}

export const useCompanyJobPostingsStore = create<CompanyJobPostingsState>((set) => ({
  postings: INITIAL_POSTINGS,
  addPosting: (title, status) =>
    set((state) => ({
      postings: [
        {
          id: `posting-${Date.now()}`,
          title: title || 'Untitled draft',
          applicants: 0,
          postedLabel: 'Just now',
          status,
        },
        ...state.postings,
      ],
    })),
}))
