import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface RouteLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Real route path. Omit for links that don't have a page yet — they render inert. */
  to?: string
  children: ReactNode
}

/** Renders a react-router `Link` when `to` is given, otherwise an inert `#` anchor. */
export function RouteLink({ to, children, ...props }: RouteLinkProps) {
  if (to) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href="#" onClick={(event) => event.preventDefault()} aria-disabled="true" {...props}>
      {children}
    </a>
  )
}
