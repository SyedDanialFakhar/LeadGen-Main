// src/pages/SignUpPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { useAuth } from '@/hooks/useAuth'

export function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  return <SignUpForm />
}