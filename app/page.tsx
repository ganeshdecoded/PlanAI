'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProblemInput from '@/components/ProblemInput'
import AgentProgress from '@/components/AgentProgress'
import type { AgentStep, PlannerOutput, InsightOutput, ReportData } from '@/lib/types'

const INITIAL_STEPS: AgentStep[] = [
  {
    step: 'planner',
    label: 'Planner Agent',
    description: 'Breaks the problem into components, goals, scope, and constraints.',
    status: 'pending',
    message: '',
    thought: '',
    preview: null,
  },
  {
    step: 'insight',
    label: 'Insight Agent',
    description: 'Enriches with stakeholder analysis, risks, and market context.',
    status: 'pending',
    message: '',
    thought: '',
    preview: null,
  },
  {
    step: 'execution',
    label: 'Execution Agent',
    description: 'Synthesises both analyses into a full structured report.',
    status: 'pending',
    message: '',
    thought: '',
    preview: null,
  },
]

type AppState = 'idle' | 'generating' | 'error'

/** Build a short human-readable preview of what an agent produced. */
function buildPreview(step: string, data: unknown): string {
  try {
    if (step === 'planner') {
      const d = data as PlannerOutput
      return [
        `Components (${d.components.length}):`,
        ...d.components.slice(0, 4).map((c) => `  • ${c}`),
        d.components.length > 4 ? `  ...+${d.components.length - 4} more` : '',
        '',
        `Goals (${d.goals.length}):`,
        ...d.goals.slice(0, 3).map((g) => `  ✓ ${g}`),
      ].filter(Boolean).join('\n')
    }
    if (step === 'insight') {
      const d = data as InsightOutput
      return [
        `Stakeholders (${d.stakeholders.length}):`,
        ...d.stakeholders.slice(0, 3).map((s) => `  • ${s.name} [${s.impact}]`),
        '',
        `Risks (${d.risks.length}):`,
        ...d.risks.slice(0, 3).map((r) => `  ⚠ ${r.risk} [${r.severity}]`),
      ].filter(Boolean).join('\n')
    }
    if (step === 'execution') {
      const d = data as ReportData
      return [
        `Action phases: ${d.actionPlan.length}`,
        ...d.actionPlan.slice(0, 4).map((p, i) => `  ${i + 1}. ${p.phase} (${p.timeline})`),
        '',
        `Tech stack: ${d.solutionApproach.techStack.slice(0, 5).join(', ')}`,
      ].filter(Boolean).join('\n')
    }
  } catch { /* malformed data */ }
  return ''
}

export default function HomePage() {
  const router = useRouter()
  const [appState, setAppState] = useState<AppState>('idle')
  const [steps, setSteps] = useState<AgentStep[]>(INITIAL_STEPS)
  const [problem, setProblem] = useState('')
  const [globalError, setGlobalError] = useState<string | null>(null)

  const patchStep = useCallback(
    (stepName: string, patch: Partial<AgentStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.step === stepName ? { ...s, ...patch } : s)),
      )
    },
    [],
  )

  const handleGenerate = useCallback(
    async (problemStatement: string) => {
      setProblem(problemStatement)
      setSteps(INITIAL_STEPS)
      setGlobalError(null)
      setAppState('generating')

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem: problemStatement }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `Server error ${res.status}`)
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            let event: {
              step: string
              status: string
              type: 'status' | 'thought'
              message: string
              data?: unknown
            }
            try { event = JSON.parse(raw) }
            catch { continue }

            const { step, status, type, message, data } = event

            if (step === 'error') {
              setGlobalError(message)
              setAppState('error')
              return
            }

            if (step === 'complete' && data) {
              try { localStorage.setItem('ai_plan_report', JSON.stringify(data)) }
              catch { /* storage full */ }
              router.push('/report')
              return
            }

            const isAgentStep = step === 'planner' || step === 'insight' || step === 'execution'
            if (!isAgentStep) continue

            if (type === 'thought') {
              // Live reasoning snippet — update the thought field only
              patchStep(step, { thought: message })
            } else {
              // Lifecycle event
              if (status === 'running') {
                patchStep(step, { status: 'running', message, thought: '' })
              } else if (status === 'done') {
                patchStep(step, {
                  status: 'done',
                  message,
                  thought: '',
                  preview: data ? buildPreview(step, data) : null,
                })
              }
            }
          }
        }
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'An unexpected error occurred.')
        setAppState('error')
      }
    },
    [router, patchStep],
  )

  if (appState === 'generating') {
    return <AgentProgress steps={steps} problem={problem} />
  }

  if (appState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5 border border-red-100">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generation Failed</h2>
          <p className="text-gray-500 text-sm mb-7 leading-relaxed">{globalError}</p>
          <button
            onClick={() => { setAppState('idle'); setGlobalError(null); setSteps(INITIAL_STEPS) }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return <ProblemInput onSubmit={handleGenerate} isLoading={false} />
}
