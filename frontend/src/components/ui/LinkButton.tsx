import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { cn } from '../../lib/cn'
import { buttonClassNames, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** A `Button`-styled react-router `Link`, for CTAs that navigate rather than submit. Always
 * given a `ROUTES.x` path, so `to` is localized to the active `/:lang` the same as RouteLink. */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = 'primary', size = 'md', className, to, ...props }, ref) => {
    const localize = useLocalizedPath()
    return (
      <Link
        ref={ref}
        className={cn(buttonClassNames(variant, size), className)}
        to={typeof to === 'string' ? localize(to) : to}
        {...props}
      />
    )
  },
)
LinkButton.displayName = 'LinkButton'
