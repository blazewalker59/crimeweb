/**
 * Loading Spinner Component
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function LoadingSpinner({
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-600 border-t-red-500 ${sizeStyles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Full page loading state
 */
export function LoadingPage() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

/**
 * Loading component with optional message
 */
interface LoadingProps {
  message?: string
}

export function Loading({ message }: LoadingProps) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      {message && <p className="text-slate-400">{message}</p>}
    </div>
  )
}
