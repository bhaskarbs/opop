export type LogoContext = 'header' | 'footer'

interface LogoConfig {
  markSize: number
  markRadius: number
  dot: number
  dotOffset: number
  accentDot: number
  accentDotOffset: number
  wordmarkSize: number
  wordmarkColor: string
  accentColor: string
  letterSpacing?: string
}

const CONFIG: Record<LogoContext, LogoConfig> = {
  header: {
    markSize: 34,
    markRadius: 9,
    dot: 12,
    dotOffset: 8,
    accentDot: 7,
    accentDotOffset: 7,
    wordmarkSize: 19,
    wordmarkColor: '#14181F',
    accentColor: '#2451D6',
    letterSpacing: '-0.01em',
  },
  footer: {
    markSize: 32,
    markRadius: 8,
    dot: 11,
    dotOffset: 7,
    accentDot: 6,
    accentDotOffset: 6,
    wordmarkSize: 18,
    wordmarkColor: '#FFFFFF',
    accentColor: '#7FA0F2',
  },
}

export function Logo({ context }: { context: LogoContext }) {
  const c = CONFIG[context]

  return (
    <>
      <span
        className="relative flex shrink-0 items-center justify-center bg-primary"
        style={{ width: c.markSize, height: c.markSize, borderRadius: c.markRadius }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{ width: c.dot, height: c.dot, left: c.dotOffset, top: c.dotOffset }}
        />
        <span
          className="absolute rounded-full bg-[#9DB8F5]"
          style={{
            width: c.accentDot,
            height: c.accentDot,
            right: c.accentDotOffset,
            bottom: c.accentDotOffset,
          }}
        />
      </span>
      <span
        style={{
          fontSize: c.wordmarkSize,
          fontWeight: 800,
          letterSpacing: c.letterSpacing,
          color: c.wordmarkColor,
        }}
      >
        Open<span style={{ color: c.accentColor }}>Opportunity</span>
      </span>
    </>
  )
}
