// src/components/auth/SignUpForm.tsx (key parts - the animated icon sections)
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw, Mail, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export function SignUpForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Password strength calculation (same as before)
  const calculatePasswordStrength = (pass: string) => {
    let strength = 0
    if (pass.length >= 6) strength++
    if (pass.length >= 8) strength++
    if (pass.match(/[a-z]+/)) strength++
    if (pass.match(/[A-Z]+/)) strength++
    if (pass.match(/[0-9]+/)) strength++
    if (pass.match(/[$@#&!]+/)) strength++
    return Math.min(strength, 5)
  }

  const passwordStrength = calculatePasswordStrength(password)
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-slate-200 dark:bg-slate-700'
    if (passwordStrength <= 2) return 'bg-red-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    if (passwordStrength <= 4) return 'bg-green-500'
    return 'bg-emerald-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return 'Enter a password'
    if (passwordStrength <= 2) return 'Weak'
    if (passwordStrength <= 3) return 'Fair'
    if (passwordStrength <= 4) return 'Good'
    return 'Strong'
  }

  const doPasswordsMatch = password === confirmPassword && password !== ''
  const doPasswordsNotMatch = confirmPassword !== '' && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)
    const err = await signUp(email, password, name)
    setIsLoading(false)

    if (err) {
      setError(err)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Animated Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* Card */}
        <div className="relative backdrop-blur-sm bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-blue-500/5">
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <RefreshCw className="w-7 h-7 text-white group-hover:rotate-180 transition-transform duration-500" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Lead<span className="text-blue-600 dark:text-blue-500">Sync</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Create your account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Field */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                  focusedField === 'name' 
                    ? "text-blue-500 dark:text-blue-400 scale-110" 
                    : "text-slate-400"
                )}>
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Charlie Smith"
                  className={cn(
                    'w-full rounded-xl border text-sm px-3 py-2.5 pl-9',
                    'bg-white dark:bg-slate-800',
                    'text-slate-900 dark:text-slate-100',
                    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'name'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]'
                      : 'border-slate-300 dark:border-slate-600',
                    'focus:outline-none',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Email address
              </label>
              <div className="relative">
                <div className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                  focusedField === 'email' 
                    ? "text-blue-500 dark:text-blue-400 scale-110" 
                    : "text-slate-400"
                )}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="charlie@company.com"
                  className={cn(
                    'w-full rounded-xl border text-sm px-3 py-2.5 pl-9',
                    'bg-white dark:bg-slate-800',
                    'text-slate-900 dark:text-slate-100',
                    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'email'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]'
                      : 'border-slate-300 dark:border-slate-600',
                    'focus:outline-none',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <div className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                  focusedField === 'password' 
                    ? "text-blue-500 dark:text-blue-400 scale-110" 
                    : "text-slate-400"
                )}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-xl border text-sm px-3 py-2.5 pl-9 pr-10',
                    'bg-white dark:bg-slate-800',
                    'text-slate-900 dark:text-slate-100',
                    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'password'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]'
                      : 'border-slate-300 dark:border-slate-600',
                    'focus:outline-none',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          level <= passwordStrength ? getPasswordStrengthColor() : 'bg-slate-200 dark:bg-slate-700'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Password strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                  focusedField === 'confirmPassword' 
                    ? "text-blue-500 dark:text-blue-400 scale-110" 
                    : doPasswordsMatch 
                      ? "text-green-500" 
                      : "text-slate-400"
                )}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-xl border text-sm px-3 py-2.5 pl-9 pr-10',
                    'bg-white dark:bg-slate-800',
                    'text-slate-900 dark:text-slate-100',
                    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'confirmPassword'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]'
                      : doPasswordsMatch
                        ? 'border-green-500'
                        : doPasswordsNotMatch
                        ? 'border-red-500'
                        : 'border-slate-300 dark:border-slate-600',
                    'focus:outline-none',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {doPasswordsMatch ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2 group relative overflow-hidden"
              size="lg"
            >
              <span className="relative z-10">Create Account</span>
              <ArrowRight className="relative z-10 w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
            LeadSync — Smart Lead Generation Platform
          </p>
        </div>
      </div>
    </div>
  )
}