'use client'

import { useState, useRef, useEffect } from 'react'
import type { SectionVersion } from '@/lib/types'

const QUICK_ACTIONS = [
  { label: 'More detailed',        instruction: 'Make this significantly more detailed and comprehensive' },
  { label: 'Professional tone',    instruction: 'Rewrite in a formal, executive-level professional tone' },
  { label: 'Shorter',              instruction: 'Shorten this to be more concise while keeping key points' },
  { label: 'Bullet points',        instruction: 'Restructure this using clear bullet points' },
  { label: 'Add examples',         instruction: 'Add specific real-world examples and use cases' },
  { label: 'Simpler language',     instruction: 'Rewrite in simpler, clearer language for a non-technical audience' },
]

interface Props {
  isOpen: boolean
  sectionKey: string
  sectionLabel: string
  currentContent: unknown
  history: SectionVersion[]
  onClose: () => void
  onSave: (updated: unknown, instruction: string) => void
}

export default function EditModal({
  isOpen, sectionKey, sectionLabel, currentContent, history, onClose, onSave,
}: Props) {
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setInstruction('')
      setError(null)
      setShowHistory(false)
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = instruction.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionKey, currentContent, instruction: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Edit failed')
      onSave(data.updated, trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={!loading ? onClose : undefined}
      />

      {/* Sheet */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="animate-scale-in bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Edit with AI</h3>
              <p className="text-xs text-gray-400 mt-0.5">{sectionLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  History ({history.length})
                </button>
              )}
              <button
                onClick={!loading ? onClose : undefined}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* History */}
          {showHistory && (
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Edit History</p>
              {[...history].reverse().map((v, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 text-xs text-gray-600">
                  <span className="text-gray-400 flex-shrink-0 tabular-nums">
                    {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="truncate">{v.instruction}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Quick actions</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setInstruction(a.instruction)}
                  disabled={loading}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-100 disabled:opacity-40 ${
                    instruction === a.instruction
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3">
            <textarea
              ref={textareaRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value.slice(0, 500))}
              placeholder="Describe how you want this section changed..."
              rows={3}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none transition-all disabled:opacity-60 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-xs text-gray-300 tabular-nums">{instruction.length} / 500</span>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={!loading ? onClose : undefined}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!instruction.trim() || loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rewriting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                    </svg>
                    Apply Edit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
