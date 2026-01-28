/**
 * Badge Component - Crime Scene Theme
 */
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

const variantStyles = {
  default: 'bg-crime-elevated text-chalk-muted',
  success: 'bg-green-900/50 text-green-400 border border-green-800',
  warning: 'bg-yellow-900/50 text-tape border border-yellow-800',
  danger: 'bg-blood-dark/50 text-blood-glow border border-blood',
  info: 'bg-blue-900/50 text-blue-400 border border-blue-800',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  )
}
