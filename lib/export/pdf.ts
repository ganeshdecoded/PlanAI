/**
 * PDF generation using `pdfkit` — runs server-side in Node.js.
 *
 * pdfkit streams data via events, so we wrap it in a Promise that
 * resolves when the 'end' event fires. This is the idiomatic Node.js
 * pattern for consuming a Readable stream into a Buffer:
 *
 *   const chunks: Buffer[] = []
 *   doc.on('data', chunk => chunks.push(chunk))
 *   doc.on('end', () => resolve(Buffer.concat(chunks)))
 *
 * Performance: pdfkit operates synchronously for layout then flushes
 * asynchronously. The await here yields the event loop while the kernel
 * drains the stream — no busy-waiting.
 */

import PDFDocument from 'pdfkit'
import type { ReportData, Risk, Stakeholder, ActionPhase } from '../types'

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLORS = {
  brand: '#1E40AF',
  text: '#111827',
  muted: '#6B7280',
  light: '#F3F4F6',
  border: '#E5E7EB',
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  white: '#FFFFFF',
  sectionBlue: '#DBEAFE',
  sectionGreen: '#D1FAE5',
  sectionPurple: '#EDE9FE',
  sectionOrange: '#FEF3C7',
}

function severityColor(severity: string): string {
  if (severity === 'High') return COLORS.high
  if (severity === 'Medium') return COLORS.medium
  return COLORS.low
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

const PAGE_MARGIN = 50
const PAGE_WIDTH = 595.28 // A4
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number): void {
  if (doc.y + needed > doc.page.height - 80) doc.addPage()
}

// Only adds a new page if we are NOT already near the top of a fresh page.
// Prevents blank waste pages when ensureSpace already triggered a page break.
function newSection(doc: InstanceType<typeof PDFDocument>): void {
  if (doc.y > (doc.page.margins?.top ?? PAGE_MARGIN) + 60) doc.addPage()
}

// Measure the height a text block will take at the current font/size settings.
function cellHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  width: number,
  fontSize: number,
  fontName: string,
): number {
  return doc.fontSize(fontSize).font(fontName).heightOfString(text, { width })
}

function sectionHeader(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  bgColor: string,
): void {
  ensureSpace(doc, 50)
  const y = doc.y
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 32).fill(bgColor)
  doc
    .fillColor(COLORS.brand)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(text, PAGE_MARGIN + 10, y + 9, { width: CONTENT_WIDTH - 20 })
  doc.y = y + 42
}

function h2(doc: InstanceType<typeof PDFDocument>, text: string): void {
  ensureSpace(doc, 30)
  doc.moveDown(0.4)
  doc.fillColor(COLORS.brand).fontSize(11).font('Helvetica-Bold').text(text, PAGE_MARGIN)
  doc.moveDown(0.2)
}

function bodyText(doc: InstanceType<typeof PDFDocument>, text: string): void {
  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica')
    .text(text, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 })
  doc.moveDown(0.5)
}

function bulletItem(doc: InstanceType<typeof PDFDocument>, text: string): void {
  ensureSpace(doc, 20)
  const y = doc.y
  doc.fillColor(COLORS.brand).circle(PAGE_MARGIN + 6, y + 5, 2.5).fill()
  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica')
    .text(text, PAGE_MARGIN + 16, y, { width: CONTENT_WIDTH - 16, lineGap: 2 })
  doc.moveDown(0.3)
}

function divider(doc: InstanceType<typeof PDFDocument>): void {
  doc.moveDown(0.5)
  doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).stroke()
  doc.moveDown(0.5)
}

function stakeholdersSection(doc: InstanceType<typeof PDFDocument>, stakeholders: Stakeholder[]): void {
  const colW = [120, 120, 190, 65]
  const headers = ['Name', 'Role', 'Interests', 'Impact']
  const HEADER_H = 22
  const CELL_PAD = 8 // vertical padding inside each row

  ensureSpace(doc, 40)
  let x = PAGE_MARGIN
  const headerY = doc.y

  // Header row
  doc.rect(PAGE_MARGIN, headerY, CONTENT_WIDTH, HEADER_H).fill(COLORS.sectionBlue)
  headers.forEach((h, i) => {
    doc
      .fillColor(COLORS.brand)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(h, x + 4, headerY + 7, { width: colW[i] - 8, lineBreak: false })
    x += colW[i]
  })

  doc.y = headerY + HEADER_H + 4

  stakeholders.forEach((s) => {
    const cells = [s.name, s.role, s.interests, s.impact]
    const fonts = ['Helvetica', 'Helvetica', 'Helvetica', 'Helvetica-Bold']

    // Measure each cell to find the tallest one → that becomes the row height
    const heights = cells.map((cell, i) =>
      cellHeight(doc, cell ?? '', colW[i] - 8, 9, fonts[i]),
    )
    const rowH = Math.max(...heights) + CELL_PAD

    ensureSpace(doc, rowH + 4)
    const rowY = doc.y
    x = PAGE_MARGIN

    cells.forEach((cell, i) => {
      doc
        .fillColor(i === 3 ? severityColor(s.impact) : COLORS.text)
        .fontSize(9)
        .font(fonts[i])
        .text(cell ?? '', x + 4, rowY + CELL_PAD / 2, { width: colW[i] - 8, lineGap: 2 })
      x += colW[i]
    })

    doc.strokeColor(COLORS.border).lineWidth(0.3).rect(PAGE_MARGIN, rowY, CONTENT_WIDTH, rowH).stroke()
    doc.y = rowY + rowH
  })

  doc.moveDown(0.5)
}

function risksSection(doc: InstanceType<typeof PDFDocument>, risks: Risk[]): void {
  const colW = [220, 70, 205]
  const headers = ['Risk', 'Severity', 'Mitigation']
  const HEADER_H = 24
  const CELL_PAD = 8

  ensureSpace(doc, 40)
  let x = PAGE_MARGIN
  const headerY = doc.y

  doc.rect(PAGE_MARGIN, headerY, CONTENT_WIDTH, HEADER_H).fill(COLORS.sectionOrange)
  headers.forEach((h, i) => {
    doc
      .fillColor(COLORS.brand)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(h, x + 4, headerY + 8, { width: colW[i] - 8, lineBreak: false })
    x += colW[i]
  })
  doc.y = headerY + HEADER_H + 4

  risks.forEach((r) => {
    const vals = [r.risk, r.severity, r.mitigation]
    const fonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica']

    // Measure all cells first to get the correct row height
    const heights = vals.map((val, i) =>
      cellHeight(doc, val ?? '', colW[i] - 8, 9, fonts[i]),
    )
    const rowH = Math.max(...heights) + CELL_PAD

    ensureSpace(doc, rowH + 4)
    const rowY = doc.y
    x = PAGE_MARGIN

    vals.forEach((val, i) => {
      doc
        .fillColor(i === 1 ? severityColor(r.severity) : COLORS.text)
        .fontSize(9)
        .font(fonts[i])
        .text(val ?? '', x + 4, rowY + CELL_PAD / 2, { width: colW[i] - 8, lineGap: 2 })
      x += colW[i]
    })

    doc.strokeColor(COLORS.border).lineWidth(0.3).rect(PAGE_MARGIN, rowY, CONTENT_WIDTH, rowH).stroke()
    doc.y = rowY + rowH
  })

  doc.moveDown(0.5)
}

function actionPhase(doc: InstanceType<typeof PDFDocument>, phase: ActionPhase, index: number): void {
  ensureSpace(doc, 60)
  const phaseY = doc.y
  doc.rect(PAGE_MARGIN, phaseY, CONTENT_WIDTH, 28).fill(COLORS.light)
  doc
    .fillColor(COLORS.brand)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(`${index + 1}. ${phase.phase}`, PAGE_MARGIN + 10, phaseY + 9, { width: CONTENT_WIDTH - 100 })
  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .font('Helvetica')
    .text(phase.timeline, PAGE_MARGIN + CONTENT_WIDTH - 90, phaseY + 11, { width: 85, align: 'right' })

  doc.y = phaseY + 36

  h2(doc, 'Tasks')
  phase.tasks.forEach((t) => bulletItem(doc, t))

  h2(doc, 'Deliverables')
  phase.deliverables.forEach((d) => bulletItem(doc, `  ${d}`))

  doc.moveDown(0.8)
}

// ─── Main export function ────────────────────────────────────────────────────

export function generatePdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: PAGE_MARGIN, bottom: 50, left: PAGE_MARGIN, right: PAGE_MARGIN },
      info: {
        Title: `Execution Plan: ${report.problemStatement}`,
        Author: 'AI Planning Agent',
        Subject: report.problemStatement,
        CreationDate: new Date(report.generatedAt),
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // ── Cover page ─────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_WIDTH, 180).fill(COLORS.brand)
    doc
      .fillColor(COLORS.white)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('AI EXECUTION PLAN', PAGE_MARGIN, 55, { align: 'center', width: CONTENT_WIDTH })
    doc.moveDown(0.5)
    doc
      .fillColor('#BFDBFE')
      .fontSize(13)
      .font('Helvetica')
      .text(report.problemStatement, PAGE_MARGIN, 110, { align: 'center', width: CONTENT_WIDTH })
    doc
      .fillColor('#93C5FD')
      .fontSize(10)
      .text(`Generated: ${generatedDate}  |  ID: ${report.id?.slice(0, 8)}`, PAGE_MARGIN, 148, {
        align: 'center',
        width: CONTENT_WIDTH,
      })

    doc.y = 200

    // ── Section 1: Problem Breakdown ───────────────────────────────────────
    sectionHeader(doc, '1.  PROBLEM BREAKDOWN', COLORS.sectionBlue)
    h2(doc, 'Executive Summary')
    bodyText(doc, report.problemBreakdown.summary)
    divider(doc)

    h2(doc, 'Core Components')
    report.problemBreakdown.components.forEach((c) => bulletItem(doc, c))
    divider(doc)

    h2(doc, 'Goals')
    report.problemBreakdown.goals.forEach((g) => bulletItem(doc, g))
    divider(doc)

    h2(doc, 'Scope')
    bodyText(doc, report.problemBreakdown.scope)
    divider(doc)

    h2(doc, 'Constraints')
    report.problemBreakdown.constraints.forEach((c) => bulletItem(doc, c))

    // ── Section 2: Stakeholders ────────────────────────────────────────────
    newSection(doc)
    sectionHeader(doc, '2.  STAKEHOLDERS', COLORS.sectionGreen)
    doc.moveDown(0.5)
    stakeholdersSection(doc, report.stakeholders)

    // ── Section 3: Solution Approach ───────────────────────────────────────
    newSection(doc)
    sectionHeader(doc, '3.  SOLUTION APPROACH', COLORS.sectionPurple)

    h2(doc, 'Overview')
    bodyText(doc, report.solutionApproach.overview)
    divider(doc)

    h2(doc, 'Strategy')
    bodyText(doc, report.solutionApproach.strategy)
    divider(doc)

    h2(doc, 'Recommended Tech Stack')
    report.solutionApproach.techStack.forEach((t) => bulletItem(doc, t))
    divider(doc)

    h2(doc, 'Methodology')
    bodyText(doc, report.solutionApproach.methodology)
    divider(doc)

    h2(doc, 'Risk Register')
    doc.moveDown(0.3)
    risksSection(doc, report.solutionApproach.risks)

    // ── Section 4: Action Plan ─────────────────────────────────────────────
    newSection(doc)
    sectionHeader(doc, '4.  ACTION PLAN', COLORS.sectionOrange)
    doc.moveDown(0.5)
    report.actionPlan.forEach((phase, i) => actionPhase(doc, phase, i))

    // ── Footer ─────────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      doc
        .fillColor(COLORS.muted)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `AI Planning Agent  |  ${generatedDate}  |  Page ${range.start + i + 1} of ${range.count}`,
          PAGE_MARGIN,
          doc.page.height - 30,
          { align: 'center', width: CONTENT_WIDTH },
        )
    }

    doc.end()
  })
}
