// src/components/scraper/ScraperHistory.tsx
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Calendar, Briefcase, MapPin, TrendingUp, Filter, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'

interface ScraperHistoryItem {
  id: string
  created_at: string
  job_title: string
  city: string
  status: 'running' | 'completed' | 'failed'
  jobs_found: number
  jobs_passed: number
  jobs_filtered: number
  completed_at: string | null
  error_message: string | null
}

interface ScraperHistoryProps {
  history: ScraperHistoryItem[]
  isLoading: boolean
}

export function ScraperHistory({ history, isLoading }: ScraperHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </CardBody>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No scraping history yet. Run your first scrape to see results here.
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Scraping History
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Track all your past scraping runs and their results
        </p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Jobs Found</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Passed Filter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Filtered Out</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map((run) => {
                const startTime = new Date(run.created_at);
                const endTime = run.completed_at ? new Date(run.completed_at) : new Date();
                const durationMs = endTime.getTime() - startTime.getTime();
                const durationMinutes = Math.floor(durationMs / 60000);
                const durationSeconds = Math.floor((durationMs % 60000) / 1000);
                const durationText = durationMinutes > 0 
                  ? `${durationMinutes}m ${durationSeconds}s` 
                  : `${durationSeconds}s`;
                
                return (
                  <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatDateTime(run.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {run.job_title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">
                          {run.city === 'Australia' ? 'All Australia' : run.city}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {run.status === 'completed' && (
                        <Badge variant="success">Completed</Badge>
                      )}
                      {run.status === 'failed' && (
                        <Badge variant="danger">Failed</Badge>
                      )}
                      {run.status === 'running' && (
                        <Badge variant="warning">Running</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {run.jobs_found}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {run.jobs_passed}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span className="text-red-600 dark:text-red-400">
                          {run.jobs_filtered}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {durationText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}