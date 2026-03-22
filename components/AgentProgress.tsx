'use client'

import { useState } from 'react'
import type { AgentStep } from '@/lib/types'

interface Props {
  steps: AgentStep[]
  problem: string
}

const STEP_THEME = {
  planner:   { color: 'blue',   hex: '#3B82F6', label: '🗂️ Planner Agent'   },
  insight:   { color: 'violet', hex: '#8B5CF6', label: '🔍 Insight Agent'    },
  execution: { color: 'emerald',hex: '#10B981', label: '⚡ Execution Agent'  },
} as const

function StepStatus({ status, color }: { status: AgentStep['status']; color: string }) {
  if (status === 'done') {
    return (
      <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className={`relative w-6 h-6 rounded-full bg-${color}-100 ring-2 ring-${color}-400 flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-3.5 h-3.5 text-${color}-600 animate-spin`} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className={`absolute inset-0 rounded-full bg-${color}-400 opacity-20 animate-ping`} />
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="w-6 h-6 rounded-full bg-red-100 ring-2 ring-red-400 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    )
  }
  return (
    <span className="w-6 h-6 rounded-full bg-gray-100 border-2 border-gray-200 flex-shrink-0" />
  )
}

function AgentCard({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const theme = STEP_THEME[step.step]
  const isActive = step.status === 'running'
  const isDone = step.status === 'done'
  const isPending = step.status === 'pending'

  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
      isActive ? `border-${theme.color}-200 shadow-sm shadow-${theme.color}-100/50` :
      isDone   ? 'border-emerald-100 bg-emerald-50/20' :
                 'border-gray-100 bg-gray-50/40'
    }`}>
      {/* Active top progress bar */}
      {isActive && (
        <div className="h-0.5 bg-gray-100">
          <div
            className={`h-full bg-${theme.color}-500 animate-[progressBar_2.5s_ease-in-out_infinite]`}
            style={{ width: '60%' }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Row: icon + title + status */}
        <div className="flex items-start gap-3">
          <StepStatus status={step.status} color={theme.color} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-semibold ${
                isDone ? 'text-gray-800' : isActive ? `text-${theme.color}-700` : 'text-gray-400'
              }`}>
                {theme.label}
              </span>
              {isActive && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-${theme.color}-100 text-${theme.color}-700`}>
                  Running
                </span>
              )}
              {isDone && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Done
                </span>
              )}
              {isPending && (
                <span className="text-[10px] text-gray-400">
                  #{index + 1}
                </span>
              )}
            </div>

            {/* Status message */}
            <p className={`text-xs leading-relaxed ${isActive || isDone ? 'text-gray-600' : 'text-gray-400'}`}>
              {step.status === 'pending' ? step.description : step.message}
            </p>
          </div>
        </div>

        {/* Live thinking stream */}
        {isActive && step.thought && (
          <div className={`mt-3 ml-9 px-3 py-2.5 rounded-lg bg-${theme.color}-50 border border-${theme.color}-100`}>
            <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-${theme.color}-500`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Thinking
              <span className={`inline-block w-1 h-3 bg-${theme.color}-400 ml-0.5 animate-[blink_1s_step-end_infinite]`} />
            </div>
            <p className={`text-xs text-${theme.color}-800 leading-relaxed line-clamp-3 font-[var(--font-geist-mono)]`}>
              {step.thought}
            </p>
          </div>
        )}

        {/* Done preview — show what the agent found, expandable */}
        {isDone && step.preview && (
          <div className="mt-3 ml-9">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {expanded ? 'Hide output' : 'Preview output'}
            </button>
            {expanded && (
              <div className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 animate-fade-in">
                <pre className="text-[11px] text-gray-600 font-[var(--font-geist-mono)] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {step.preview}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentProgress({ steps, problem }: Props) {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const hasError  = steps.some((s) => s.status === 'error')
  const allDone   = doneCount === steps.length
  const progress  = Math.round((doneCount / steps.length) * 100)

  const activeStep = steps.find((s) => s.status === 'running')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">PlanAI</span>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {allDone ? 'Complete' : hasError ? 'Failed' : `Agent ${doneCount + 1} / ${steps.length}`}
        </span>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-4 border ${
              hasError ? 'bg-red-50 text-red-600 border-red-200' :
              allDone  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                         'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {!allDone && !hasError && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {allDone  ? '✓ Plan ready — redirecting...' :
               hasError ? 'Pipeline failed' :
               activeStep ? `${STEP_THEME[activeStep.step].label} is thinking...` : 'Starting pipeline...'}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {allDone ? 'Your plan is ready' : hasError ? 'Something went wrong' : 'Building your plan'}
            </h2>
            <p className="text-sm text-gray-400 line-clamp-1 max-w-sm mx-auto" title={problem}>
              &ldquo;{problem}&rdquo;
            </p>
          </div>

          {/* Progress bar */}
          {!hasError && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                <span>Progress</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Agent cards */}
          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <AgentCard key={step.step} step={step} index={i} />
            ))}
          </div>

          {/* Footer note */}
          {!allDone && !hasError && (
            <p className="text-center text-xs text-gray-400 mt-6">
              Gemini 2.5 Flash with dynamic thinking &middot; each agent feeds the next
            </p>
          )}

          {hasError && (
            <p className="text-center text-sm text-red-600 mt-5">
              {steps.find((s) => s.status === 'error')?.message}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
