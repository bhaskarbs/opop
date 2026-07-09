import { useParams } from 'react-router-dom'
import { PlaceholderPage } from './PlaceholderPage'

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  return (
    <PlaceholderPage
      title="Job Detail"
      description={`Job posting content column + sidebar cross-sell. jobId: ${jobId}`}
    />
  )
}
