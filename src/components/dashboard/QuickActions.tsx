// src/components/dashboard/QuickActions.tsx
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Mail, Linkedin } from 'lucide-react'

interface Action {
  label: string
  description: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  onClick: () => void
  highlight?: boolean
}

export function QuickActions() {
  const navigate = useNavigate()

  const actions: Action[] = [
    {
      label: 'Run Seek Scrape',
      description: 'Pull new job listings from Seek',
      icon: <Search className="w-4 h-4" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/scraper'),
      highlight: true,
    },
    {
      label: 'Run LinkedIn Scrape',
      description: 'Pull leads from LinkedIn Jobs',
      icon: <Linkedin className="w-4 h-4" />,
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      onClick: () => navigate('/scraper'),
    },
    {
      label: 'Enrich Contacts',
      description: 'Find emails via Hunter & Apollo',
      icon: <Sparkles className="w-4 h-4" />,
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      onClick: () => navigate('/enrichment'),
    },
    {
      label: 'Send Follow-ups',
      description: 'Resume pending email sequences',
      icon: <Mail className="w-4 h-4" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      onClick: () => navigate('/emails'),
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
          Quick Actions
        </h3>
      </div>

      {/* Actions list */}
      <div className="p-3 flex flex-col gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`
              w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left
              transition-all duration-150 group
              ${
                action.highlight
                  ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }
            `}
          >
            {/* Icon */}
            <div
              className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${action.iconBg} ${action.iconColor}
                group-hover:scale-105 transition-transform duration-150
              `}
            >
              {action.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold leading-tight ${
                  action.highlight
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {action.label}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {action.description}
              </p>
            </div>

            {/* Arrow */}
            <svg
              className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                action.highlight
                  ? 'text-blue-400 dark:text-blue-500'
                  : 'text-slate-300 dark:text-slate-600'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}