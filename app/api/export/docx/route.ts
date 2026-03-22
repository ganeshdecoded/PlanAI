/**
 * POST /api/export/docx
 *
 * Accepts the full ReportData JSON body and streams back a .docx file.
 *
 * Why POST and not GET?
 *   The report data can be several KB. Sending it as a query param would
 *   hit URL length limits and expose data in server logs. POST with a
 *   body is the correct approach for data-carrying export endpoints.
 *
 * Security:
 *   - Rate limited to 10 exports/minute per IP
 *   - Report data validated for required fields before processing
 *   - Content-Disposition header forces a browser download (no inline render)
 *
 * Performance:
 *   - generateDocx() calls Packer.toBuffer() which is async — the event
 *     loop is not blocked during DOCX serialisation.
 *   - Content-Length is set so the browser can show a progress indicator.
 */

import type { NextRequest } from 'next/server'

import { generateDocx } from '@/lib/export/docx'
import { checkRateLimit, getClientIP, validateReportData } from '@/lib/security'
import type { ReportData } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`docx:${ip}`, 10, 60_000)

  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please wait before exporting again.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  // ── Parse & validate ───────────────────────────────────────────────────────
  let report: ReportData
  try {
    report = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON in request body.' }, { status: 400 })
  }

  const validation = validateReportData(report)
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  // ── Generate DOCX ─────────────────────────────────────────────────────────
  try {
    const buffer = await generateDocx(report)
    const safeId = report.id?.replace(/[^a-z0-9-]/gi, '').slice(0, 8) ?? 'report'
    const filename = `ai-plan-${safeId}.docx`

    // Buffer → Uint8Array: the Web Fetch API Response body accepts Uint8Array,
    // not Node.js Buffer directly (despite Buffer extending Uint8Array, TypeScript
    // needs the explicit cast for the BodyInit union type).
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const safeMessage =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'DOCX generation failed. Please try again.'

    return Response.json({ error: safeMessage }, { status: 500 })
  }
}
