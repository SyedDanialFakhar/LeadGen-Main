// src/components/scraper/ScraperLog.tsx
import { useEffect, useRef } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Terminal } from 'lucide-react'

interface ScraperLogProps {
  logs: string[]
  isRunning: boolean
}

export function ScraperLog({ logs, isRunning }: ScraperLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Scraper Log
            </h3>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                Running
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="bg-slate-950 rounded-b-xl p-4 h-48 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">
              <Terminal className="w-4 h-4 mx-auto mb-2 opacity-50" />
              <p>Ready to scrape...</p>
              <p className="text-xs mt-1">Logs will appear here</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const isError = log.includes('❌') || log.includes('Error')
              const isSuccess = log.includes('✅') || log.includes('✨')
              const isWarning = log.includes('⚠️')
              
              return (
                <div key={i} className={`mb-1 ${
                  isError ? 'text-red-400' : 
                  isSuccess ? 'text-green-400' : 
                  isWarning ? 'text-yellow-400' : 
                  'text-slate-300'
                }`}>
                  {log}
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </CardBody>
    </Card>
  )
}