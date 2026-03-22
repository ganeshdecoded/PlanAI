/**
 * DOCX generation using the `docx` package.
 *
 * Runs server-side (Node.js) via the /api/export/docx route.
 * Returns a Buffer that is streamed directly to the client as an attachment.
 *
 * Performance: Packer.toBuffer is async and non-blocking.
 * All paragraph/table helpers are pure functions — no I/O, no state.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx'
import type { ActionPhase, ReportData, Risk, Stakeholder } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND_COLOR = '1E40AF' // blue-800
const HEADER_BG = 'EFF6FF' // blue-50

function title(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, size: 52, color: BRAND_COLOR }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  })
}

function h1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 36, color: BRAND_COLOR })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 500, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_COLOR, space: 4 },
    },
  })
}

function h2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: '374151' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
  })
}

function para(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 160 },
  })
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 80 },
  })
}

function separator(): Paragraph {
  return new Paragraph({ text: '', spacing: { after: 100 } })
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
    spacing: { after: 100 },
  })
}

function severityColor(severity: string): string {
  if (severity === 'High') return 'DC2626'
  if (severity === 'Medium') return 'D97706'
  return '16A34A'
}

function stakeholderTable(stakeholders: Stakeholder[]): Table {
  const headerRow = new TableRow({
    children: ['Name', 'Role', 'Interests', 'Impact'].map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: true, size: 20, color: '1E3A5F' })],
            }),
          ],
          shading: { type: ShadingType.SOLID, fill: HEADER_BG },
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
    ),
  })

  const dataRows = stakeholders.map(
    (s) =>
      new TableRow({
        children: [s.name, s.role, s.interests, s.impact].map(
          (text) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: text ?? '', size: 20 })] })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
        ),
      }),
  )

  return new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })
}

function riskTable(risks: Risk[]): Table {
  const headerRow = new TableRow({
    children: ['Risk', 'Severity', 'Mitigation'].map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: true, size: 20, color: '1E3A5F' })],
            }),
          ],
          shading: { type: ShadingType.SOLID, fill: HEADER_BG },
          width: { size: text === 'Severity' ? 15 : text === 'Risk' ? 35 : 50, type: WidthType.PERCENTAGE },
        }),
    ),
  })

  const dataRows = risks.map(
    (r) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: r.risk, size: 20 })] })],
            width: { size: 35, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: r.severity,
                    bold: true,
                    color: severityColor(r.severity),
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: r.mitigation, size: 20 })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
  )

  return new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })
}

function actionPhaseBlock(phase: ActionPhase, index: number): Paragraph[] {
  return [
    h2(`${index + 1}. ${phase.phase} — ${phase.timeline}`),
    h2('Tasks'),
    ...phase.tasks.map((t) => bullet(t)),
    h2('Deliverables'),
    ...phase.deliverables.map((d) => bullet(d, 1)),
    separator(),
  ]
}

// ─── Main export function ────────────────────────────────────────────────────

export async function generateDocx(report: ReportData): Promise<Buffer> {
  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const doc = new Document({
    creator: 'AI Planning Agent',
    title: `Execution Plan: ${report.problemStatement}`,
    description: 'Auto-generated by AI Planning Agent',
    sections: [
      {
        children: [
          // ── Cover ─────────────────────────────────────────────────────────
          title('AI EXECUTION PLAN'),
          new Paragraph({
            children: [new TextRun({ text: report.problemStatement, size: 28, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Generated: ${generatedDate}`, size: 20, color: '6B7280' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // ── 1. Problem Breakdown ──────────────────────────────────────────
          h1('1. Problem Breakdown'),
          h2('Executive Summary'),
          para(report.problemBreakdown.summary),
          separator(),

          h2('Core Components'),
          ...report.problemBreakdown.components.map((c) => bullet(c)),
          separator(),

          h2('Goals'),
          ...report.problemBreakdown.goals.map((g) => bullet(g)),
          separator(),

          h2('Scope'),
          para(report.problemBreakdown.scope),
          separator(),

          h2('Constraints'),
          ...report.problemBreakdown.constraints.map((c) => bullet(c)),
          separator(),

          // ── 2. Stakeholders ───────────────────────────────────────────────
          h1('2. Stakeholders'),
          separator(),
          stakeholderTable(report.stakeholders),
          separator(),

          // ── 3. Solution Approach ──────────────────────────────────────────
          h1('3. Solution Approach'),
          h2('Overview'),
          para(report.solutionApproach.overview),
          separator(),

          h2('Strategy'),
          para(report.solutionApproach.strategy),
          separator(),

          h2('Recommended Tech Stack'),
          ...report.solutionApproach.techStack.map((t) => bullet(t)),
          separator(),

          h2('Methodology'),
          para(report.solutionApproach.methodology),
          separator(),

          h2('Risk Register'),
          separator(),
          riskTable(report.solutionApproach.risks),
          separator(),

          // ── 4. Action Plan ────────────────────────────────────────────────
          h1('4. Action Plan'),
          ...report.actionPlan.flatMap((phase, i) => actionPhaseBlock(phase, i)),

          // ── Footer ────────────────────────────────────────────────────────
          separator(),
          new Paragraph({
            children: [
              new TextRun({
                text: `Report ID: ${report.id}  |  Generated by AI Planning Agent  |  ${generatedDate}`,
                size: 18,
                color: '9CA3AF',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
