/**
 * POST /api/export/pdf
 *
 * Accepts the full ReportData JSON body and streams back a .pdf file.
 * PDF is generated server-side using pdfkit — no headless browser required,
 * so this works cleanly in Vercel's serverless environment.
 *
 * Security & performance characteristics are identical to the DOCX route.
 * See /api/export/docx/route.ts for full commentary.
 */

import type { NextRequest } from 'next/server'

import { generatePdf } from '@/lib/export/pdf'
import { checkRateLimit, getClientIP, validateReportData } from '@/lib/security'
import type { ReportData } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`pdf:${ip}`, 10, 60_000)

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

  // ── Generate PDF ───────────────────────────────────────────────────────────
  try {
    const buffer = await generatePdf(report)
    const safeId = report.id?.replace(/[^a-z0-9-]/gi, '').slice(0, 8) ?? 'report'
    const filename = `ai-plan-${safeId}.pdf`

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const safeMessage =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'PDF generation failed. Please try again.'

    return Response.json({ error: safeMessage }, { status: 500 })
  }
}
