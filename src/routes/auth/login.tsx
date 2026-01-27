/**
 * Login Route
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth'
import { useAuth } from '@/components/auth'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: '/' })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-2">
            Sign in to your CrimeWeb account
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <LoginForm onSuccess={() => navigate({ to: '/' })} />
        </div>

        <p className="text-center mt-6 text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="text-red-400 hover:text-red-300 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
