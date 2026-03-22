'use client'

import { useState, useEffect, useRef } from 'react'

const EXAMPLES = [
  'Build a creator marketplace platform',
  'Launch a B2B SaaS for HR teams',
  'Scale a food delivery startup to 10 cities',
  'Build an AI-powered legal document reviewer',
  'Create a fintech app for Gen Z savings',
  'Design a remote-first onboarding platform',
]

const PLACEHOLDER_CYCLE = [
  'Describe your problem, idea, or challenge...',
  'e.g. "Build a creator marketplace platform"',
  'e.g. "Launch a B2B SaaS product for HR teams"',
  'e.g. "Scale a food delivery startup to 10 cities"',
]

const AGENTS = [
  { icon: '🗂️', name: 'Planner', desc: 'Breaks down the problem into components, goals & scope' },
  { icon: '🔍', name: 'Insight', desc: 'Maps stakeholders, risks and strategic context' },
  { icon: '⚡', name: 'Execution', desc: 'Synthesises a structured execution report' },
]

interface Props {
  onSubmit: (problem: string) => void
  isLoading: boolean
}

export default function ProblemInput({ onSubmit, isLoading }: Props) {
  const [problem, setProblem] = useState('')
  const [focused, setFocused] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Rotate placeholder text every 3s when textarea is empty & unfocused
  useEffect(() => {
    if (problem || focused) return
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_CYCLE.length), 3000)
    return () => clearInterval(id)
  }, [problem, focused])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = problem.trim()
    if (trimmed.length < 10 || isLoading) return
    onSubmit(trimmed)
  }

  const fillExample = (ex: string) => {
    setProblem(ex)
    textareaRef.current?.focus()
  }

  const charCount = problem.length
  const isValid = charCount >= 10

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">PlanAI</span>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            Gemini 2.5 Flash
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          3-agent pipeline
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Badge */}
        <div className="animate-fade-up delay-0 mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI-powered execution planning
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 text-center text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-4 max-w-3xl">
          Turn any problem into a{' '}
          <span className="gradient-text">structured plan</span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-200 text-center text-gray-500 text-lg mb-10 max-w-xl leading-relaxed">
          A three-agent AI pipeline — Planner, Insight, Execution — builds you a professional,
          editable report in under a minute.
        </p>

        {/* Input card */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up delay-300 w-full max-w-2xl"
        >
          <div className={`relative rounded-2xl border-2 bg-white shadow-lg transition-all duration-200 ${
            focused ? 'border-blue-500 shadow-blue-100 shadow-xl' : 'border-gray-200'
          }`}>
            <textarea
              ref={textareaRef}
              value={problem}
              onChange={(e) => setProblem(e.target.value.slice(0, 2000))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={PLACEHOLDER_CYCLE[placeholderIdx]}
              rows={5}
              disabled={isLoading}
              className="w-full px-5 pt-5 pb-2 text-[15px] text-gray-800 placeholder-gray-400 bg-transparent resize-none outline-none leading-relaxed font-[var(--font-geist-sans)] disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-5 pb-4 pt-2">
              <span className={`text-xs tabular-nums transition-colors ${charCount > 1800 ? 'text-orange-500' : 'text-gray-300'}`}>
                {charCount > 0 ? `${charCount} / 2000` : ''}
              </span>
              <button
                type="submit"
                disabled={!isValid || isLoading}
                className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95 shadow-sm disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Plan
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => fillExample(ex)}
                disabled={isLoading}
                className="text-xs px-3.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {/* Agent pipeline preview */}
        <div className="animate-fade-up delay-400 mt-16 w-full max-w-2xl">
          <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-widest mb-5">
            How it works
          </p>
          <div className="grid grid-cols-3 gap-3">
            {AGENTS.map((agent, i) => (
              <div key={agent.name} className="relative">
                {/* Connector */}
                {i < AGENTS.length - 1 && (
                  <div className="absolute top-5 left-[calc(100%_-_1px)] w-3 h-px bg-gray-200 z-10" />
                )}
                <div className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all duration-200">
                  <span className="text-2xl mb-2">{agent.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 mb-1">
                    <span className="text-gray-400 mr-1">{i + 1}.</span>{agent.name}
                  </span>
                  <span className="text-xs text-gray-400 leading-snug">{agent.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Each agent feeds its output into the next — producing richer, more coherent results than any single prompt.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-5 text-xs text-gray-400 border-t border-gray-100">
        Built with Gemini 2.5 Flash &middot; Exports to DOCX &amp; PDF
      </footer>
    </div>
  )
}
