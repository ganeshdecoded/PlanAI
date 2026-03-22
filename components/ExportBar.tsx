'use client'

import { useState } from 'react'
import type { ReportData } from '@/lib/types'

type ExportState = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  report: ReportData
  onNewPlan: () => void
}

function ExportButton({
  label, icon, onClick, state, variant = 'outline',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  state: ExportState
  variant?: 'primary' | 'outline'
}) {
  const base = 'flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 border select-none'
  const styles = {
    idle: variant === 'primary'
      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 active:scale-95'
      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95',
    loading: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error:   'bg-red-50 border-red-200 text-red-600',
  }[state]

  return (
    <button onClick={state === 'idle' ? onClick : undefined} className={`${base} ${styles}`}>
      {state === 'loading' ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : state === 'success' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : state === 'error' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : icon}
      <span className="hidden sm:inline">
        {state === 'loading' ? 'Exporting...' : state === 'success' ? 'Downloaded!' : state === 'error' ? 'Retry' : label}
      </span>
      <span className="sm:hidden">
        {state === 'loading' ? '...' : state === 'success' ? '✓' : label.split(' ')[1]}
      </span>
    </button>
  )
}

export default function ExportBar({ report, onNewPlan }: Props) {
  const [docxState, setDocxState] = useState<ExportState>('idle')
  const [pdfState, setPdfState] = useState<ExportState>('idle')

  const triggerDownload = async (
    route: '/api/export/docx' | '/api/export/pdf',
    filename: string,
    mime: string,
    set: (s: ExportState) => void,
  ) => {
    if (docxState === 'loading' || pdfState === 'loading') return
    set('loading')
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(new Blob([blob], { type: mime }))
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
      set('success')
      setTimeout(() => set('idle'), 3000)
    } catch {
      set('error')
      setTimeout(() => set('idle'), 4000)
    }
  }

  const safeId = report.id?.slice(0, 8) ?? 'report'

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm hidden sm:inline">PlanAI</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ExportButton
            label="Download DOCX"
            state={docxState}
            variant="primary"
            onClick={() => triggerDownload(
              '/api/export/docx',
              `ai-plan-${safeId}.docx`,
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              setDocxState,
            )}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <ExportButton
            label="Download PDF"
            state={pdfState}
            onClick={() => triggerDownload(
              '/api/export/pdf',
              `ai-plan-${safeId}.pdf`,
              'application/pdf',
              setPdfState,
            )}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />

          <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />

          <button
            onClick={onNewPlan}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Plan</span>
          </button>
        </div>
      </div>
    </div>
  )
}
