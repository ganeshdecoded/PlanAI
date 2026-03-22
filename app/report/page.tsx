'use client'

/**
 * /report page — displays the generated ReportData.
 *
 * Data source: localStorage key 'ai_plan_report'.
 * The root page saves the completed report here before navigating.
 *
 * Why localStorage and not URL params or query strings?
 *   - Report JSON can be 10-30 KB — too large for a URL.
 *   - Server-side session would require auth infrastructure.
 *   - localStorage is the right tool for ephemeral, large, client-side state.
 *
 * Auto-save: Every AI edit in ReportView re-saves to localStorage,
 * so refreshing the page restores the latest edited version.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReportView from '@/components/ReportView'
import type { ReportData } from '@/lib/types'

export default function ReportPage() {
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai_plan_report')
      if (raw) {
        const parsed = JSON.parse(raw) as ReportData
        // Basic sanity check before rendering
        if (parsed.problemStatement && parsed.problemBreakdown) {
          setReport(parsed)
        }
      }
    } catch {
      // Corrupted localStorage data — redirect to home
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNewPlan = () => {
    // Clear saved report and go home
    try {
      localStorage.removeItem('ai_plan_report')
    } catch { /* empty */ }
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Report Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            Generate a plan first by entering your problem statement.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Create a Plan
          </button>
        </div>
      </div>
    )
  }

  return <ReportView initialReport={report} onNewPlan={handleNewPlan} />
}
