// src/components/scraper/ScraperLog.tsx
import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react'

interface ScraperLogProps {
  logs: string[]
  isRunning: boolean
}

export function ScraperLog({ logs, isRunning }: ScraperLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false) // Changed to false (initially collapsed)

  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isExpanded])

  const getLogStyle = (log: string) => {
    if (log.includes('❌') || log.includes('Error')) return 'text-red-400'
    if (log.includes('✅') || log.includes('✨')) return 'text-emerald-400'
    if (log.includes('⚠️')) return 'text-yellow-400'
    if (log.includes('🔍') || log.includes('🌐')) return 'text-blue-400'
    if (log.includes('🚀') || log.includes('📥')) return 'text-violet-400'
    if (log.includes('🚫') || log.includes('📝') || log.includes('⚖️')) return 'text-orange-400'
    return 'text-slate-300'
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="select-none py-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Scraper Log</h3>
              {logs.length > 0 && (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-xs tabular-nums">
                  {logs.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && logs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Live
                </span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardBody className="p-0">
          <div className="bg-slate-950 rounded-b-xl h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Terminal className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-500">Terminal ready</p>
                <p className="text-xs text-slate-600 mt-1">Logs will appear here when you start a search</p>
              </div>
            ) : (
              <div className="p-4 space-y-0.5 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={`leading-relaxed ${getLogStyle(log)}`}>
                    {log}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </CardBody>
      )}
    </Card>
  )
}