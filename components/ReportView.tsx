'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ReportData, SectionVersion } from '@/lib/types'
import SectionCard from './SectionCard'
import ExportBar from './ExportBar'

type SectionKey = 'problemBreakdown' | 'stakeholders' | 'solutionApproach' | 'actionPlan'

const SECTIONS: { key: SectionKey; label: string; icon: string; shortLabel: string }[] = [
  { key: 'problemBreakdown', label: 'Problem Breakdown', icon: '🗂️', shortLabel: 'Breakdown' },
  { key: 'stakeholders',     label: 'Stakeholders',      icon: '👥', shortLabel: 'Stakeholders' },
  { key: 'solutionApproach', label: 'Solution Approach', icon: '💡', shortLabel: 'Solution' },
  { key: 'actionPlan',       label: 'Action Plan',        icon: '📋', shortLabel: 'Action Plan' },
]

interface Props {
  initialReport: ReportData
  onNewPlan: () => void
}

export default function ReportView({ initialReport, onNewPlan }: Props) {
  const [report, setReport] = useState<ReportData>(initialReport)
  const [activeSection, setActiveSection] = useState<SectionKey>('problemBreakdown')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [history, setHistory] = useState<Record<SectionKey, SectionVersion[]>>({
    problemBreakdown: [],
    stakeholders: [],
    solutionApproach: [],
    actionPlan: [],
  })

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionKey)
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    for (const key of SECTIONS.map((s) => s.key)) {
      const el = sectionRefs.current[key]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const scrollTo = (key: SectionKey) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleUpdate = useCallback(
    (sectionKey: SectionKey, updated: unknown, instruction: string) => {
      setHistory((prev) => ({
        ...prev,
        [sectionKey]: [
          ...prev[sectionKey],
          { content: report[sectionKey], timestamp: new Date().toISOString(), instruction },
        ],
      }))
      setReport((prev) => {
        const next = { ...prev, [sectionKey]: updated }
        try { localStorage.setItem('ai_plan_report', JSON.stringify(next)) } catch { /* full */ }
        return next
      })
    },
    [report],
  )

  const handleUndo = useCallback(
    (sectionKey: SectionKey) => {
      const versions = history[sectionKey]
      if (!versions.length) return
      const previous = versions[versions.length - 1]
      setReport((prev) => {
        const next = { ...prev, [sectionKey]: previous.content }
        try { localStorage.setItem('ai_plan_report', JSON.stringify(next)) } catch { /* full */ }
        return next
      })
      setHistory((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].slice(0, -1),
      }))
    },
    [history],
  )

  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const totalEdits = Object.values(history).reduce((s, v) => s + v.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky export bar */}
      <ExportBar report={report} onNewPlan={onNewPlan} />

      {/* Report header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-700/50">
                  AI Execution Plan
                </span>
                <span className="text-xs text-blue-400">{generatedDate}</span>
                {totalEdits > 0 && (
                  <span className="text-xs font-medium text-violet-300 bg-violet-900/40 px-2 py-0.5 rounded-full border border-violet-700/40">
                    {totalEdits} edit{totalEdits > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight mb-3 text-white">
                {report.problemStatement}
              </h1>
              <p className="text-blue-300 text-sm">
                Planner Agent → Insight Agent → Execution Agent &middot; Gemini 2.5 Flash
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Components',      value: report.problemBreakdown?.components?.length ?? 0, icon: '🧩' },
              { label: 'Stakeholders',    value: report.stakeholders?.length ?? 0,                  icon: '👥' },
              { label: 'Risks Analysed',  value: report.solutionApproach?.risks?.length ?? 0,       icon: '⚠️' },
              { label: 'Action Phases',   value: report.actionPlan?.length ?? 0,                    icon: '🎯' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/8 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{stat.icon}</span>
                  <span className="text-2xl font-extrabold text-white">{stat.value}</span>
                </div>
                <div className="text-xs text-blue-300 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => scrollTo(s.key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
                  activeSection === s.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {SECTIONS.map((s, i) => (
          <div
            key={s.key}
            id={s.key}
            ref={(el) => { sectionRefs.current[s.key] = el }}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <SectionCard
              sectionKey={s.key}
              content={report[s.key]}
              history={history[s.key]}
              canUndo={history[s.key].length > 0}
              onUpdate={(updated, instruction) => handleUpdate(s.key, updated, instruction)}
              onUndo={() => handleUndo(s.key)}
            />
          </div>
        ))}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-200 text-xs text-gray-400">
          <div>
            Report ID: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{report.id?.slice(0, 16)}</code>
          </div>
          <div>Generated {generatedDate} &middot; Powered by Gemini 2.5 Flash</div>
        </div>
      </div>
    </div>
  )
}
