/**
 * POST /api/edit
 *
 * Re-processes a single report section using an AI instruction.
 * The response preserves the original JSON structure of the section
 * so the UI can do a drop-in replacement without layout changes.
 *
 * Security:
 *   - Rate limited to 20 edits/minute per IP (more generous than /generate)
 *   - Instruction sanitised and capped at 500 chars
 *   - currentContent JSON-stringified before embedding in prompt
 *     (prevents prompt injection via crafted content values)
 *
 * Performance:
 *   - Only sends the specific section to Gemini, not the whole report.
 *     This keeps token count low and latency fast (~2-4s vs 15-30s for full generation).
 *   - JSON mode guarantees a parseable response on the first try.
 */

import type { NextRequest } from 'next/server'

import { generateJson } from '@/lib/gemini'
import {
  checkRateLimit,
  getClientIP,
  validateEditRequest,
} from '@/lib/security'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`edit:${ip}`, 20, 60_000)

  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please slow down your edit requests.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  // ── Parse & validate ───────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON in request body.' }, { status: 400 })
  }

  const validation = validateEditRequest(body)
  if (!validation.valid || !validation.data) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const { section, currentContent, instruction } = validation.data

  // ── Build Gemini prompt ────────────────────────────────────────────────────
  // currentContent is stringified separately so it cannot escape the JSON fence
  const prompt = `You are a professional AI report editor. The user wants to revise a specific section of a business report.

Section name: "${section}"

Current section content (JSON):
${JSON.stringify(currentContent, null, 2)}

User instruction: "${instruction}"

Rewrite the content of this section following the user's instruction precisely.

Rules:
- Preserve the EXACT same JSON structure and all field names.
- Do not add or remove fields.
- If a field is an array, keep it as an array.
- If a field is a string, keep it as a string.
- Apply the instruction meaningfully — do not produce a trivially changed version.
- Return ONLY the updated JSON object/array for this section. No markdown, no explanation.`

  try {
    const updated = await generateJson<unknown>(prompt)
    return Response.json({ updated })
  } catch (err) {
    const safeMessage =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Failed to edit section. Please try again.'

    return Response.json({ error: safeMessage }, { status: 500 })
  }
}
