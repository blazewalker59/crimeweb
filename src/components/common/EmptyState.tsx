/**
 * Empty State Component - Crime Scene Theme
 */
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="flex justify-center mb-4 text-chalk-dim">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-chalk mb-2">{title}</h3>
      {description && (
        <p className="text-chalk-dim mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
