// // src/components/scraper/ScraperConfigCard.tsx
// import { useState } from 'react'
// import { Play, ChevronDown, ChevronUp, Info, Settings2 } from 'lucide-react'
// import { Card, CardHeader, CardBody } from '@/components/ui/Card'
// import { Button } from '@/components/ui/Button'
// import { MultiSelect } from '@/components/ui/MultiSelect'
// import { Select } from '@/components/ui/Select'
// import { CITIES, JOB_ROLES } from '@/utils/constants'

// interface ScraperConfigCardProps {
//   onStart: (config: {
//     jobTitles: string[]
//     city: string
//     maxResults: number
//     skipPages: number
//     minAgeDays: number
//     salesOnly: boolean
//   }) => void
//   isLoading: boolean
//   hasResults?: boolean
//   onLoadMore?: () => void
//   isLoadingMore?: boolean
//   hasMore?: boolean
// }

// export function ScraperConfigCard({
//   onStart,
//   isLoading,
//   hasResults = false,
//   onLoadMore,
//   isLoadingMore = false,
//   hasMore = false,
// }: ScraperConfigCardProps) {
//   // ═══════════════════════════════════════════════════════════════════════
//   // STATE - SIMPLIFIED TO ESSENTIALS
//   // ═══════════════════════════════════════════════════════════════════════
//   const [searchMode, setSearchMode] = useState<'older' | 'recent'>('older')
//   const [jobTitles, setJobTitles] = useState<string[]>([JOB_ROLES[0]]) // Default: first role
//   const [location, setLocation] = useState('Australia')
//   const [showAdvanced, setShowAdvanced] = useState(false)
  
//   // Advanced options (hidden by default)
//   const [maxResults, setMaxResults] = useState(20)
//   const [customSkipPages, setCustomSkipPages] = useState(5)
//   const [customMinAge, setCustomMinAge] = useState(7)

//   // ═══════════════════════════════════════════════════════════════════════
//   // COMPUTED VALUES BASED ON MODE
//   // ═══════════════════════════════════════════════════════════════════════
//   const getConfigForMode = () => {
//     if (searchMode === 'older') {
//       // OLDER MODE: Get jobs 7-14 days old
//       return {
//         skipPages: showAdvanced ? customSkipPages : 5,  // Skip ~100 newest jobs
//         minAgeDays: showAdvanced ? customMinAge : 7,    // Last 7-14 days
//       }
//     } else {
//       // RECENT MODE: Get latest jobs
//       return {
//         skipPages: 0,                                    // Start from page 1
//         minAgeDays: 0,                                   // No date filter
//       }
//     }
//   }

//   // ═══════════════════════════════════════════════════════════════════════
//   // HANDLERS
//   // ═══════════════════════════════════════════════════════════════════════
//   const handleQuickSearch = () => {
//     if (jobTitles.length === 0) {
//       alert('Please select at least one job title')
//       return
//     }
    
//     const modeConfig = getConfigForMode()
    
//     onStart({
//       jobTitles,
//       city: location,
//       maxResults: showAdvanced ? maxResults : 20,
//       skipPages: modeConfig.skipPages,
//       minAgeDays: modeConfig.minAgeDays,
//       salesOnly: true,  // Always true for your use case
//     })
//   }

//   // ═══════════════════════════════════════════════════════════════════════
//   // HELPER TEXT
//   // ═══════════════════════════════════════════════════════════════════════
//   const getSearchModeDescription = () => {
//     if (searchMode === 'older') {
//       return {
//         emoji: '⏳',
//         title: 'Older Jobs (>7 days)',
//         description: 'Best for warm leads with less competition',
//         color: 'blue',
//       }
//     } else {
//       return {
//         emoji: '⚡',
//         title: 'Recent Jobs (<7 days)',
//         description: 'Fresh listings but highly competitive',
//         color: 'green',
//       }
//     }
//   }

//   const modeInfo = getSearchModeDescription()

//   // ═══════════════════════════════════════════════════════════════════════
//   // RENDER
//   // ═══════════════════════════════════════════════════════════════════════
//   return (
//     <Card>
//       <CardHeader>
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//             <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
//               🎯 Find Sales Leads
//             </h3>
//           </div>
//           {isLoading && (
//             <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
//               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
//               <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
//                 Searching...
//               </span>
//             </div>
//           )}
//         </div>
//         <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
//           Search for job postings in Sales classification across Australia
//         </p>
//       </CardHeader>

//       <CardBody className="space-y-5">
//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* SEARCH MODE SELECTION */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="space-y-3">
//           <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
//             Search Type
//           </label>
//           <div className="grid grid-cols-2 gap-3">
//             {/* OLDER JOBS BUTTON */}
//             <button
//               type="button"
//               onClick={() => setSearchMode('older')}
//               disabled={isLoading}
//               className={`
//                 p-4 rounded-xl border-2 transition-all text-left
//                 ${searchMode === 'older'
//                   ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
//                   : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
//                 }
//                 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
//               `}
//             >
//               <div className="flex items-start justify-between mb-2">
//                 <span className="text-2xl">⏳</span>
//                 {searchMode === 'older' && (
//                   <div className="w-2 h-2 bg-blue-600 rounded-full" />
//                 )}
//               </div>
//               <p className="font-semibold text-slate-900 dark:text-white text-sm">
//                 Older Jobs
//               </p>
//               <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
//                 >7 days old • Less competition
//               </p>
//             </button>

//             {/* RECENT JOBS BUTTON */}
//             <button
//               type="button"
//               onClick={() => setSearchMode('recent')}
//               disabled={isLoading}
//               className={`
//                 p-4 rounded-xl border-2 transition-all text-left
//                 ${searchMode === 'recent'
//                   ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
//                   : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
//                 }
//                 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
//               `}
//             >
//               <div className="flex items-start justify-between mb-2">
//                 <span className="text-2xl">⚡</span>
//                 {searchMode === 'recent' && (
//                   <div className="w-2 h-2 bg-green-600 rounded-full" />
//                 )}
//               </div>
//               <p className="font-semibold text-slate-900 dark:text-white text-sm">
//                 Recent Jobs
//               </p>
//               <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
//                 <7 days • Highly competitive
//               </p>
//             </button>
//           </div>
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* JOB TITLES */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="space-y-2">
//           <MultiSelect
//             label="Job Titles"
//             options={JOB_ROLES}
//             selected={jobTitles}
//             onChange={setJobTitles}
//             placeholder="Select job titles to search..."
//             disabled={isLoading}
//             helperText={`${jobTitles.length} selected`}
//           />
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* LOCATION */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="space-y-2">
//           <Select
//             label="Location"
//             value={location}
//             onChange={(e) => setLocation(e.target.value)}
//             disabled={isLoading}
//             options={[
//               { value: 'Australia', label: '🌏 All Australia' },
//               ...CITIES.filter(c => c !== 'Australia').map(c => ({
//                 value: c,
//                 label: c
//               }))
//             ]}
//           />
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* ADVANCED SETTINGS (COLLAPSIBLE) */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div>
//           <button
//             type="button"
//             onClick={() => setShowAdvanced(!showAdvanced)}
//             className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
//           >
//             {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
//             Advanced Settings
//           </button>

//           {showAdvanced && (
//             <div className="mt-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4 bg-slate-50 dark:bg-slate-800/50">
//               <div>
//                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
//                   Max Results per Job Title
//                 </label>
//                 <select
//                   value={maxResults}
//                   onChange={(e) => setMaxResults(Number(e.target.value))}
//                   className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
//                 >
//                   <option value={10}>10 results</option>
//                   <option value={20}>20 results (default)</option>
//                   <option value={30}>30 results</option>
//                   <option value={50}>50 results</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
//                   Skip Pages (for older jobs)
//                 </label>
//                 <select
//                   value={customSkipPages}
//                   onChange={(e) => setCustomSkipPages(Number(e.target.value))}
//                   className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
//                 >
//                   <option value={0}>0 pages (newest first)</option>
//                   <option value={3}>3 pages (~60 jobs skipped)</option>
//                   <option value={5}>5 pages (~100 jobs skipped)</option>
//                   <option value={10}>10 pages (~200 jobs skipped)</option>
//                   <option value={15}>15 pages (~300 jobs skipped)</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
//                   Minimum Age (days)
//                 </label>
//                 <select
//                   value={customMinAge}
//                   onChange={(e) => setCustomMinAge(Number(e.target.value))}
//                   className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
//                 >
//                   <option value={0}>Any age</option>
//                   <option value={7}>7+ days old</option>
//                   <option value={14}>14+ days old</option>
//                   <option value={21}>21+ days old</option>
//                   <option value={30}>30+ days old</option>
//                 </select>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* SEARCH SUMMARY */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className={`p-4 rounded-lg ${
//           searchMode === 'older' 
//             ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
//             : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
//         }`}>
//           <div className="flex items-start gap-3">
//             <span className="text-2xl">{modeInfo.emoji}</span>
//             <div className="flex-1">
//               <p className={`font-semibold text-sm ${
//                 searchMode === 'older' ? 'text-blue-900 dark:text-blue-100' : 'text-green-900 dark:text-green-100'
//               }`}>
//                 {modeInfo.title}
//               </p>
//               <p className={`text-xs mt-1 ${
//                 searchMode === 'older' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'
//               }`}>
//                 {modeInfo.description}
//               </p>
//               <div className={`mt-3 space-y-1 text-xs ${
//                 searchMode === 'older' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
//               }`}>
//                 <p>📌 {jobTitles.length} job title(s) selected</p>
//                 <p>📍 Location: {location === 'Australia' ? 'All Australia' : location}</p>
//                 <p>📊 Up to {showAdvanced ? maxResults : 20} results per title</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* AUTOMATIC FILTERS INFO */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
//           <Info className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
//           <div className="text-xs text-green-700 dark:text-green-300">
//             <p className="font-semibold mb-1">✅ Automatic Filters (Always Active)</p>
//             <ul className="space-y-0.5">
//               <li>• 📂 Sales classification only</li>
//               <li>• 🚫 No recruitment agencies</li>
//               <li>• 📝 No jobs blocking agencies</li>
//               <li>• 🏢 No private advertisers</li>
//               <li>• ⚖️ No law firms</li>
//             </ul>
//           </div>
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* ACTION BUTTONS */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="space-y-3">
//           <Button
//             onClick={handleQuickSearch}
//             isLoading={isLoading}
//             leftIcon={<Play className="w-4 h-4" />}
//             className="w-full"
//             size="lg"
//             disabled={isLoading || jobTitles.length === 0}
//           >
//             {isLoading
//               ? 'Searching Seek.com.au...'
//               : `🔍 Search ${jobTitles.length} Job Title${jobTitles.length !== 1 ? 's' : ''}`}
//           </Button>

//           {/* Load More Button (shown when there are results and more available) */}
//           {hasResults && hasMore && onLoadMore && (
//             <Button
//               onClick={onLoadMore}
//               isLoading={isLoadingMore}
//               variant="outline"
//               className="w-full"
//               disabled={isLoadingMore || isLoading}
//             >
//               {isLoadingMore ? 'Loading More...' : '🔄 Load More Results'}
//             </Button>
//           )}
//         </div>

//         {/* ───────────────────────────────────────────────────────────────── */}
//         {/* HELPFUL TIPS */}
//         {/* ───────────────────────────────────────────────────────────────── */}
//         <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
//           <p className="font-semibold text-slate-600 dark:text-slate-300">💡 Pro Tips:</p>
//           <p>• Older jobs (>7 days) have less competition and are warmer leads</p>
//           <p>• Multiple job titles search faster in parallel</p>
//           <p>• All filters are applied to save API credits</p>
//         </div>
//       </CardBody>
//     </Card>
//   )
// }