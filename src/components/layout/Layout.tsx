// src/components/layout/Layout.tsx
import { useState, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { useTheme } from '@/hooks/useTheme'

// ─── Shared context so Sidebar can notify Layout of collapse state ────────────
export const SidebarContext = createContext<{
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}>({ collapsed: false, setCollapsed: () => {} })

export function useSidebarContext() {
  return useContext(SidebarContext)
}

export function Layout() {
  const { isDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Sidebar />
        {/* Main shifts when sidebar collapses */}
        <main className={`min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'ml-16' : 'ml-60'}`}>
          <Outlet />
        </main>
        <ToastContainer />
      </div>
    </SidebarContext.Provider>
  )
}