// src/components/auth/ForgotPasswordForm.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Mail, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    const err = await resetPassword(email)
    setIsLoading(false)

    if (err) {
      setError(err)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Animated Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Card */}
        <div className="
          relative backdrop-blur-sm
          bg-white/90 dark:bg-slate-900/90
          border border-slate-200/50 dark:border-slate-800/50
          rounded-2xl shadow-2xl p-8
          transition-all duration-300 hover:shadow-blue-500/5
        ">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer group-hover:scale-105 transition-transform">
                <RefreshCw className="w-7 h-7 text-white group-hover:rotate-180 transition-transform duration-500" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Lead<span className="text-blue-600 dark:text-blue-500">Sync</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Reset your password
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Check your email
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We've sent a password reset link to <strong className="text-blue-600 dark:text-blue-400">{email}</strong>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium mt-4 group"
              >
                Back to Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="charlie@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoComplete="email"
                  disabled={isLoading}
                  error={error || undefined}
                />

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full group relative overflow-hidden"
                  size="lg"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors inline-flex items-center gap-1 group"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
            LeadSync — Smart Lead Generation Platform
          </p>
        </div>
      </div>
    </div>
  )
}