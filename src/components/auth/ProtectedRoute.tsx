/**
 * Protected Route Component
 * Wraps routes that require authentication
 */
import { useAuth } from './AuthProvider'
import { Navigate, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login with return URL
    return (
      <Navigate to="/auth/login" search={{ redirect: location.pathname }} />
    )
  }

  return <>{children}</>
}
