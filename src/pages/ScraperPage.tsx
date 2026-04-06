// src/pages/ScraperPage.tsx
import { useState, useEffect } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScraperControls } from '@/components/scraper/ScraperControls'
import { ScraperLog } from '@/components/scraper/ScraperLog'
import { JobTable } from '@/components/scraper/JobTable'
import { ScraperHistory } from '@/components/scraper/ScraperHistory'
import { useScraper } from '@/hooks/useScraper'
import { getScraperHistory, ScraperHistoryItem } from '@/services/scraperHistoryService'
import { Card, CardBody } from '@/components/ui/Card'
import { AlertCircle, Search, History, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ScraperPage() {
  const {
    isLoading,
    isLoadingMore,
    jobs,
    logs,
    error,
    currentPage,
    totalJobs,
    itemsPerPage,
    hasMore,
    startScrape,
    loadMore,
    setCurrentPage,
  } = useScraper()
  
  const [history, setHistory] = useState<ScraperHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  // Reload history when jobs change (after new scrape)
  useEffect(() => {
    if (!isLoading && jobs.length > 0) {
      loadHistory()
    }
  }, [isLoading, jobs.length])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const data = await getScraperHistory(20)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav
        title="Job Scraper"
        subtitle="Search any city in Australia - Limit results to save API credits"
      />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header with button on the same row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Job Scraper
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Search for job titles in ANY Australian city - Results limited to save API credits
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              leftIcon={showHistory ? <ChevronUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
              className="shadow-sm"
            >
              {showHistory ? 'Hide Scrape History' : 'View Scrape History'}
              {!showHistory && history.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                  {history.length}
                </span>
              )}
            </Button>
          </div>

          {/* Collapsible Scraper History Section */}
          {showHistory && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <ScraperHistory history={history} isLoading={historyLoading} />
            </div>
          )}

          <ScraperControls 
            onStart={startScrape}
            onLoadMore={loadMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            currentResultCount={jobs.length}
          />

          <ScraperLog logs={logs} isRunning={isLoading} />

          {error && (
            <Card>
              <CardBody>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Error Occurred
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {jobs.length > 0 && (
            <Card>
              <CardBody>
                <JobTable
                  jobs={jobs}
                  currentPage={currentPage}
                  totalJobs={totalJobs}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </CardBody>
            </Card>
          )}

          {!isLoading && jobs.length === 0 && !error && logs.length === 0 && (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ready to Search
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Select job titles, choose ANY Australian city, and click search.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                    🌏 Supports all Australian cities - Melbourne, Sydney, Brisbane, Perth, Adelaide,
                    Gold Coast, Newcastle, Wollongong, Geelong, Cairns, and more!
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    💡 Each search is limited to 20 results to save API credits
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}