/**
 * POST /api/generate
 *
 * Orchestrates the three-agent pipeline and streams everything back
 * to the client as Server-Sent Events (SSE).
 *
 * There are two kinds of SSE events:
 *
 *   type: 'status'  — lifecycle updates (agent started, agent done, report ready)
 *   type: 'thought' — live reasoning snippets from Gemini's thinking stream
 *
 * The thinking stream is the core technical differentiator of this system.
 * Each agent is called with an onThought() callback wired directly to the SSE
 * controller, so the model's internal reasoning appears in the browser in
 * real-time as it is produced — not after the fact.
 *
 * This is only possible because:
 *   1. generateContentStream() is used (not generateContent())
 *   2. includeThoughts: true surfaces reasoning tokens in the stream
 *   3. Thought parts and response parts are separated before accumulating JSON
 *   4. The SSE stream is held open for the full duration of all three agents
 *
 * Sequential pipeline (intentional):
 *   Each agent embeds the previous agent's full output in its prompt, so
 *   running them in parallel would break the context-chaining property that
 *   makes the pipeline qualitatively better than a single prompt.
 */

import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

import { runPlanner }   from '@/lib/agents/planner'
import { runInsight }   from '@/lib/agents/insight'
import { runExecution } from '@/lib/agents/execution'
import {
  checkRateLimit,
  getClientIP,
  sanitizeInput,
  validateProblemStatement,
} from '@/lib/security'
import type { PlannerOutput, InsightOutput, ReportData } from '@/lib/types'

export const runtime    = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed, remaining } = checkRateLimit(`generate:${ip}`, 5, 60_000)
  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please wait before generating another plan.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } },
    )
  }

  // ── Parse & validate ───────────────────────────────────────────────────────
  let body: unknown
  try { body = await req.json() }
  catch { return Response.json({ error: 'Invalid JSON in request body.' }, { status: 400 }) }

  const rawProblem = (body as Record<string, unknown>)?.problem
  const validation = validateProblemStatement(rawProblem)
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const problem = sanitizeInput(rawProblem as string)

  // ── SSE stream ─────────────────────────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      /** Encode and enqueue one SSE data frame. */
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      /**
       * Returns a throttled onThought callback for a given agent step.
       * We debounce slightly to avoid flooding the SSE stream with hundreds
       * of tiny chunks — the UI shows one thought at a time anyway.
       */
      const makeThoughtSender = (step: string) => {
        let lastSent = 0
        return (snippet: string) => {
          const now = Date.now()
          // Throttle to one thought event per 150 ms per agent
          if (now - lastSent < 150) return
          lastSent = now
          send({ step, status: 'running', type: 'thought', message: snippet })
        }
      }

      try {
        // ── Step 1: Planner ────────────────────────────────────────────────
        send({ step: 'planner', status: 'running', type: 'status', message: 'Analysing problem structure...' })
        const plannerOutput: PlannerOutput = await runPlanner(problem, makeThoughtSender('planner'))
        send({
          step: 'planner', status: 'done', type: 'status',
          message: `Found ${plannerOutput.components.length} components, ${plannerOutput.goals.length} goals`,
          data: plannerOutput,
        })

        // ── Step 2: Insight ────────────────────────────────────────────────
        send({ step: 'insight', status: 'running', type: 'status', message: 'Mapping stakeholders and risks...' })
        const insightOutput: InsightOutput = await runInsight(problem, plannerOutput, makeThoughtSender('insight'))
        send({
          step: 'insight', status: 'done', type: 'status',
          message: `Identified ${insightOutput.stakeholders.length} stakeholders, ${insightOutput.risks.length} risks`,
          data: insightOutput,
        })

        // ── Step 3: Execution ──────────────────────────────────────────────
        send({ step: 'execution', status: 'running', type: 'status', message: 'Synthesising execution report...' })
        const reportSection = await runExecution(problem, plannerOutput, insightOutput, makeThoughtSender('execution'))
        const report: ReportData = {
          id: randomUUID(),
          problemStatement: problem,
          generatedAt: new Date().toISOString(),
          ...reportSection,
        }
        send({
          step: 'execution', status: 'done', type: 'status',
          message: `Report complete — ${report.actionPlan.length} action phases`,
          data: report,
        })

        // ── Terminal event ─────────────────────────────────────────────────
        send({ step: 'complete', status: 'done', type: 'status', message: 'All agents complete.', data: report })

      } catch (err) {
        const safeMessage =
          process.env.NODE_ENV === 'development' && err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.'
        send({ step: 'error', status: 'error', type: 'status', message: safeMessage })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': remaining.toString(),
    },
  })
}
