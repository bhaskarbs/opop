export interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="mx-auto max-w-[1280px] px-6 py-16">
      <p className="mb-2 text-meta font-semibold text-fog uppercase">Coming soon</p>
      <h1 className="text-h1 text-ink">{title}</h1>
      {description && <p className="text-body mt-3 max-w-xl text-slate">{description}</p>}
    </main>
  )
}
