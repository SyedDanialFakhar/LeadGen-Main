// src/components/layout/Layout.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { useTheme } from '@/hooks/useTheme'

export function Layout() {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <Sidebar />
      <main className="ml-60 min-h-screen">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}