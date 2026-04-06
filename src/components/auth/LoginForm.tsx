// src/components/auth/LoginForm.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export function LoginForm() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setIsLoading(true)
    const err = await signIn(email, password)
    setIsLoading(false)

    if (err) {
      setError(err)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-2xl shadow-xl p-8
        ">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              LeadFlow
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automated Lead Generation
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="charlie@company.com.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Password Field with Show/Hide */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-lg border text-sm px-3 py-2 pl-9 pr-10',
                    'bg-white dark:bg-slate-800',
                    'text-slate-900 dark:text-slate-100',
                    'border-slate-300 dark:border-slate-600',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'dark:focus:ring-blue-400',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="
                flex items-center gap-2 px-3 py-2.5 rounded-lg
                bg-red-50 dark:bg-red-900/30
                border border-red-200 dark:border-red-800
                text-red-700 dark:text-red-400
                text-sm
              ">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
            LeadFlow v1.0 — Recruitment Lead Automation
          </p>
        </div>
      </div>
    </div>
  )
}