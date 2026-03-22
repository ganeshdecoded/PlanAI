/**
 * Execution Agent — Step 3 of the agentic pipeline.
 *
 * Responsibility: Synthesises the outputs of both previous agents
 * (Planner + Insight) into a comprehensive, structured execution report.
 *
 * Context chaining: Both PlannerOutput and InsightOutput are embedded in
 * the prompt. The agent is not starting from scratch — it refines and
 * synthesises. This three-step chain produces qualitatively better output
 * than any single prompt because each agent specialises in one cognitive task:
 *   1. Decompose  (Planner)
 *   2. Enrich     (Insight)
 *   3. Synthesise (Execution)
 *
 * Async note: runExecution is a single async function. The orchestration
 * of all three agents with proper sequential awaiting is done in the
 * /api/generate route handler so the SSE stream can emit progress events
 * between steps.
 */

import { generateJsonWithThinking } from '../gemini'
import type { PlannerOutput, InsightOutput, ReportSection } from '../types'

export async function runExecution(
  problem: string,
  plannerOutput: PlannerOutput,
  insightOutput: InsightOutput,
  onThought?: (snippet: string) => void,
): Promise<ReportSection> {
  const prompt = `You are an execution planning AI agent — the final stage of a three-agent pipeline. You receive fully structured analysis from a Planner Agent and an Insight Agent. Your task is to synthesise this into a professional, complete execution report.

Original Problem:
"${problem}"

Planner Agent Analysis:
${JSON.stringify(plannerOutput, null, 2)}

Insight Agent Analysis:
${JSON.stringify(insightOutput, null, 2)}

Synthesise everything above into a JSON object with EXACTLY this shape:

{
  "problemBreakdown": {
    "summary": "A crisp 3-4 sentence executive summary of the problem and why solving it matters.",
    "components": ["refined component 1", "component 2", "component 3", "component 4", "component 5"],
    "goals": ["refined goal 1", "goal 2", "goal 3", "goal 4"],
    "scope": "Refined 2-3 sentence scope definition.",
    "constraints": ["refined constraint 1", "constraint 2", "constraint 3", "constraint 4"]
  },
  "stakeholders": [
    {
      "name": "stakeholder name",
      "role": "role",
      "interests": "interests",
      "impact": "High"
    }
  ],
  "solutionApproach": {
    "overview": "3-4 sentence high-level overview of the recommended approach.",
    "strategy": "4-5 sentences explaining the specific strategic approach: what to build, how to build it, and key strategic decisions.",
    "techStack": ["technology 1", "technology 2", "technology 3", "technology 4", "technology 5", "technology 6"],
    "methodology": "The recommended development/execution methodology with a 2-3 sentence justification for why it fits this problem.",
    "risks": [
      {
        "risk": "risk description",
        "severity": "High",
        "mitigation": "mitigation strategy"
      }
    ]
  },
  "actionPlan": [
    {
      "phase": "Phase 1: Discovery & Planning",
      "tasks": ["task 1", "task 2", "task 3", "task 4"],
      "deliverables": ["deliverable 1", "deliverable 2"],
      "timeline": "Weeks 1-2"
    }
  ]
}

Rules:
- actionPlan: create exactly 4-5 phases. Each phase builds on the previous.
- stakeholders: use all stakeholders from Insight Agent (preserve name, role, interests, impact).
- solutionApproach.risks: use all risks from Insight Agent (preserve risk, severity, mitigation).
- techStack: 5-8 specific, real technologies relevant to this problem.
- Every field must be substantive and specific to this problem.
- Return ONLY valid JSON. No markdown fences, no explanation.`

  const result = await generateJsonWithThinking<ReportSection>(prompt, onThought)

  if (
    !result.problemBreakdown ||
    !Array.isArray(result.stakeholders) ||
    !result.solutionApproach ||
    !Array.isArray(result.actionPlan)
  ) {
    throw new Error('Execution Agent: response is missing required fields.')
  }

  return result
}
