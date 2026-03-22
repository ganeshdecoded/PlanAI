'use client'

import { useState } from 'react'
import EditModal from './EditModal'
import type { SectionVersion, Stakeholder, Risk, ActionPhase } from '@/lib/types'

// ─── Shared micro-components ───────────────────────────────────────────────────

function Tag({ text, color = 'blue' }: { text: string; color?: 'blue' | 'emerald' | 'violet' | 'amber' | 'red' | 'rose' | 'slate' }) {
  const styles: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    rose:   'bg-rose-50 text-rose-700 border-rose-100',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${styles[color]}`}>
      {text}
    </span>
  )
}

function SeverityTag({ severity }: { severity: string }) {
  const colors: Record<string, 'red' | 'amber' | 'emerald'> = { High: 'red', Medium: 'amber', Low: 'emerald' }
  return <Tag text={severity} color={colors[severity] ?? 'slate'} />
}

function ImpactTag({ impact }: { impact: string }) {
  const colors: Record<string, 'red' | 'amber' | 'emerald'> = { High: 'red', Medium: 'amber', Low: 'emerald' }
  return <Tag text={impact} color={colors[impact] ?? 'slate'} />
}

function Divider() {
  return <div className="my-5 border-t border-gray-100" />
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  )
}

function BulletList({ items, color = '#3B82F6' }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {item}
        </li>
      ))}
    </ul>
  )
}

// ─── Section renderers ─────────────────────────────────────────────────────────

interface PBContent {
  summary: string; components: string[]; goals: string[]; scope: string; constraints: string[]
}

function ProblemBreakdownView({ content }: { content: PBContent }) {
  return (
    <div className="space-y-6">
      {/* Summary callout */}
      <div className="relative rounded-xl bg-blue-50 border border-blue-100 px-5 py-4">
        <div className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">
          Executive Summary
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{content.summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <SubLabel>Core Components</SubLabel>
          <BulletList items={content.components} color="#3B82F6" />
        </div>
        <div>
          <SubLabel>Goals</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {content.goals.map((g, i) => <Tag key={i} text={g} color="blue" />)}
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <SubLabel>Scope</SubLabel>
        <p className="text-sm text-gray-600 leading-relaxed">{content.scope}</p>
      </div>

      <Divider />

      <div>
        <SubLabel>Constraints</SubLabel>
        <BulletList items={content.constraints} color="#6B7280" />
      </div>
    </div>
  )
}

function StakeholdersView({ content }: { content: Stakeholder[] }) {
  return (
    <div className="space-y-3">
      {content.map((s, i) => (
        <div key={i} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all duration-150">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">{s.name}</span>
              <ImpactTag impact={s.impact} />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">{s.role}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{s.interests}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface SAContent {
  overview: string; strategy: string; techStack: string[]; methodology: string; risks: Risk[]
}

function SolutionApproachView({ content }: { content: SAContent }) {
  return (
    <div className="space-y-6">
      <div className="relative rounded-xl bg-violet-50 border border-violet-100 px-5 py-4">
        <div className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-violet-500">
          Overview
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{content.overview}</p>
      </div>

      <div>
        <SubLabel>Strategy</SubLabel>
        <p className="text-sm text-gray-600 leading-relaxed">{content.strategy}</p>
      </div>

      <Divider />

      <div>
        <SubLabel>Recommended Tech Stack</SubLabel>
        <div className="flex flex-wrap gap-2">
          {content.techStack.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-slate-100">
              {t}
            </span>
          ))}
        </div>
      </div>

      <Divider />

      <div>
        <SubLabel>Methodology</SubLabel>
        <p className="text-sm text-gray-600 leading-relaxed">{content.methodology}</p>
      </div>

      <Divider />

      <div>
        <SubLabel>Risk Register</SubLabel>
        <div className="space-y-2.5 mt-1">
          {content.risks.map((r, i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-4 py-3 bg-gray-50">
                <span className="text-sm font-medium text-gray-800">{r.risk}</span>
                <SeverityTag severity={r.severity} />
              </div>
              <div className="px-4 py-2.5 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-gray-500 leading-relaxed">{r.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActionPlanView({ content }: { content: ActionPhase[] }) {
  const [open, setOpen] = useState<number>(0)

  return (
    <div className="space-y-2.5">
      {content.map((phase, i) => (
        <div key={i} className={`rounded-xl border overflow-hidden transition-all duration-150 ${open === i ? 'border-amber-200 shadow-sm' : 'border-gray-100'}`}>
          {/* Accordion header */}
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${open === i ? 'bg-amber-50' : 'bg-gray-50/70 hover:bg-gray-100/70'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${open === i ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i + 1}
              </span>
              <span className={`font-semibold text-sm truncate ${open === i ? 'text-amber-800' : 'text-gray-700'}`}>
                {phase.phase}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full hidden sm:inline">
                {phase.timeline}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Accordion body */}
          {open === i && (
            <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-in">
              <div>
                <SubLabel>Tasks</SubLabel>
                <ul className="space-y-2">
                  {phase.tasks.map((t, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                        {j + 1}
                      </span>
                      <span className="leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SubLabel>Deliverables</SubLabel>
                <ul className="space-y-2">
                  {phase.deliverables.map((d, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Section config ────────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<string, {
  label: string; icon: string; accent: string; headerBg: string; borderColor: string
}> = {
  problemBreakdown: {
    label: 'Problem Breakdown', icon: '🗂️',
    accent: 'text-blue-600', headerBg: 'bg-blue-600', borderColor: 'border-l-blue-500',
  },
  stakeholders: {
    label: 'Stakeholders', icon: '👥',
    accent: 'text-emerald-600', headerBg: 'bg-emerald-600', borderColor: 'border-l-emerald-500',
  },
  solutionApproach: {
    label: 'Solution Approach', icon: '💡',
    accent: 'text-violet-600', headerBg: 'bg-violet-600', borderColor: 'border-l-violet-500',
  },
  actionPlan: {
    label: 'Action Plan', icon: '📋',
    accent: 'text-amber-600', headerBg: 'bg-amber-500', borderColor: 'border-l-amber-500',
  },
}

// ─── SectionCard ────────────────────────────────────────────────────────────────

interface Props {
  sectionKey: string
  content: unknown
  history: SectionVersion[]
  canUndo: boolean
  onUpdate: (content: unknown, instruction: string) => void
  onUndo: () => void
}

export default function SectionCard({ sectionKey, content, history, onUpdate, onUndo, canUndo }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const cfg = SECTION_CONFIG[sectionKey] ?? {
    label: sectionKey, icon: '📄', accent: 'text-gray-600', headerBg: 'bg-gray-500', borderColor: 'border-l-gray-400',
  }

  const renderContent = () => {
    if (sectionKey === 'problemBreakdown') return <ProblemBreakdownView content={content as PBContent} />
    if (sectionKey === 'stakeholders')     return <StakeholdersView content={content as Stakeholder[]} />
    if (sectionKey === 'solutionApproach') return <SolutionApproachView content={content as SAContent} />
    if (sectionKey === 'actionPlan')       return <ActionPlanView content={content as ActionPhase[]} />
    return <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{JSON.stringify(content, null, 2)}</pre>
  }

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden border-l-4 ${cfg.borderColor} card-lift`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{cfg.icon}</span>
            <h2 className={`font-bold text-sm ${cfg.accent}`}>{cfg.label}</h2>
            {history.length > 0 && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {history.length} edit{history.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {canUndo && (
              <button
                onClick={onUndo}
                title="Undo last edit"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Undo
              </button>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit with AI
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">{renderContent()}</div>
      </div>

      <EditModal
        isOpen={editOpen}
        sectionKey={sectionKey}
        sectionLabel={cfg.label}
        currentContent={content}
        history={history}
        onClose={() => setEditOpen(false)}
        onSave={(updated, instruction) => {
          onUpdate(updated, instruction)
          setEditOpen(false)
        }}
      />
    </>
  )
}
