// src/components/ui/Toast.tsx
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/useToast'
import type { ReactNode } from 'react'
import type { ToastType } from '@/hooks/useToast'

const config: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
    classes:
      'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
    classes:
      'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    classes:
      'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    classes:
      'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200',
  },
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const { icon, classes } = config[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
              'animate-in slide-in-from-right-4 fade-in-0 duration-200',
              classes
            )}
          >
            {icon}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}