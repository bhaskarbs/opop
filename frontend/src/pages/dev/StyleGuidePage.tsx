import type { ReactNode } from 'react'
import { Badge, Button, Card, CardDescription, CardTitle, Input, Tag } from '../../components/ui'
import type { ButtonVariant } from '../../components/ui'
import { Footer, Header } from '../../components/layout'

const colorSwatches: Array<{ name: string; className: string; hex: string }> = [
  { name: 'Primary Blue', className: 'bg-primary', hex: '#2451D6' },
  { name: 'Partnership Amber', className: 'bg-amber', hex: '#C2760C' },
  { name: 'Community Teal', className: 'bg-teal', hex: '#0F8A6B' },
  { name: 'Ink (text-primary)', className: 'bg-ink', hex: '#14181F' },
  { name: 'Slate (text-secondary)', className: 'bg-slate', hex: '#5B6472' },
  { name: 'Fog (text-tertiary)', className: 'bg-fog', hex: '#8891A0' },
  { name: 'Border', className: 'bg-border', hex: '#E2E5EA' },
  { name: 'Page background', className: 'bg-page border border-border', hex: '#F7F8FA' },
  { name: 'Surface', className: 'bg-surface border border-border', hex: '#FFFFFF' },
]

const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'amber', 'teal', 'dark']

const spacingScale = [4, 8, 12, 16, 20, 24, 32, 48, 64]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="mb-6 border-b-2 border-border pb-2 text-h2 text-ink">{title}</h2>
      {children}
    </section>
  )
}

function StyleGuidePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-1 text-h1 text-ink">Style Guide</h1>
      <p className="mb-12 text-meta text-fog">
        Live primitives rendered from `frontend/src/theme/tokens.css` — compare against{' '}
        <code>OpenOpportunity job portal/StyleGuide.dc.html</code>.
      </p>

      <Section title="Color palette">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {colorSwatches.map((swatch) => (
            <div key={swatch.name} className="flex items-center gap-3">
              <span className={`h-8 w-9 shrink-0 rounded ${swatch.className}`} />
              <div>
                <p className="text-sm font-semibold text-ink">{swatch.name}</p>
                <p className="font-mono text-[12px] text-fog">{swatch.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-3">
          <p className="text-h1 text-ink">Aa Job title</p>
          <p className="text-h2 text-ink">Aa Section heading</p>
          <p className="text-h3 text-ink">Aa Card title</p>
          <p className="text-body text-[#3A414D]">Aa Body copy for descriptions and content</p>
          <p className="text-meta text-fog">Aa Timestamps, counts, labels</p>
        </div>
      </Section>

      <Section title="Spacing scale">
        <div className="flex items-end gap-2">
          {spacingScale.map((px) => (
            <div key={px} className="bg-primary" style={{ width: px, height: px }} />
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant[0].toUpperCase() + variant.slice(1)}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-2">
          <Tag variant="neutral">Neutral tag</Tag>
          <Tag variant="primary">Job / primary</Tag>
          <Tag variant="partnership">Partnership</Tag>
          <Tag variant="community">Community</Tag>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Rejected</Badge>
        </div>
      </Section>

      <Section title="Card">
        <Card interactive className="max-w-sm">
          <CardTitle>Card title</CardTitle>
          <CardDescription>
            White surface, 1px border, 12–16px radius, 20–28px padding. Used for job cards, startup
            cards, dashboard tiles.
          </CardDescription>
        </Card>
      </Section>

      <Section title="Form field">
        <div className="max-w-sm">
          <Input label="Field label" placeholder="Placeholder text" />
        </div>
      </Section>

      <Section title="Navigation — Header (guest)">
        <div className="border border-border">
          <Header variant="guest" sticky={false} />
        </div>
      </Section>

      <Section title="Navigation — Header (candidate, logged in)">
        <div className="border border-border">
          <Header variant="candidate" activeItem="Find Jobs" sticky={false} />
        </div>
      </Section>

      <Section title="Navigation — Footer">
        <div className="overflow-hidden rounded-card">
          <Footer />
        </div>
      </Section>
    </main>
  )
}

export default StyleGuidePage
