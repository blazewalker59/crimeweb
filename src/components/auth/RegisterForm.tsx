/**
 * Register Form Component
 */
import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import { useNavigate } from '@tanstack/react-router'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, displayName)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      // In development, auto-confirm is often enabled
      // In production, user would need to confirm email
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          navigate({ to: '/auth/login' })
        }
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-green-400 text-5xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2">Account Created!</h2>
        <p className="text-slate-400">
          Please check your email to confirm your account.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-400"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="reg-password"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-400"
          placeholder="At least 6 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-400"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  )
}
