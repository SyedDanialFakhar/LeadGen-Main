// src/components/scraper/ScraperEmptyState.tsx
import { Search } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'

export function ScraperEmptyState() {
  return (
    <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
      <CardBody>
        <div className="text-center py-16">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl shadow-inner" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-9 h-9 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Ready to find Sales leads
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Configure your search above, then click <strong className="text-slate-700 dark:text-slate-300">Search</strong>. 
            Agency &amp; firm filters are applied automatically.
          </p>

          <div className="flex items-center justify-center gap-8 mt-10">
            {[
              { dot: 'bg-emerald-400', label: 'Sales filter at source' },
              { dot: 'bg-blue-400',    label: '~20s target time' },
              { dot: 'bg-indigo-400',  label: '15–18 leads expected' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}