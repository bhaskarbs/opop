import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { buttonClassNames, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** A `Button`-styled react-router `Link`, for CTAs that navigate rather than submit. */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    return <Link ref={ref} className={cn(buttonClassNames(variant, size), className)} {...props} />
  },
)
LinkButton.displayName = 'LinkButton'
