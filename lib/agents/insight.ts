/**
 * Insight Agent — Step 2 of the agentic pipeline.
 *
 * Responsibility: Takes the planner's structured breakdown and enriches it
 * with stakeholder analysis, risk assessment, market context, success metrics,
 * and external dependencies.
 *
 * Context chaining: The full PlannerOutput is embedded in the prompt so this
 * agent builds directly on top of step 1 instead of re-deriving the same info.
 * This is the key property that makes this a true multi-step agentic pipeline
 * rather than independent calls.
 */

import { generateJsonWithThinking } from '../gemini'
import type { InsightOutput, PlannerOutput } from '../types'

export async function runInsight(
  problem: string,
  plannerOutput: PlannerOutput,
  onThought?: (snippet: string) => void,
): Promise<InsightOutput> {
  const prompt = `You are a strategic insights AI agent. You have received a problem and its initial structural breakdown from a Planner Agent. Your task is to enrich this with stakeholder mapping, risk analysis, and market context.

Original Problem:
"${problem}"

Planner Agent Output:
${JSON.stringify(plannerOutput, null, 2)}

Using this context, return a JSON object with EXACTLY this shape:

{
  "stakeholders": [
    {
      "name": "e.g. Product Team",
      "role": "Their functional role in this context",
      "interests": "What they care about — goals, pain points, expectations",
      "impact": "High"
    }
  ],
  "risks": [
    {
      "risk": "Specific risk description",
      "severity": "High",
      "mitigation": "Concrete mitigation strategy"
    }
  ],
  "marketContext": "3-4 sentences covering relevant industry trends, competitive landscape, and environmental factors that directly inform this problem.",
  "successMetrics": [
    "KPI 1 — measurable success criterion",
    "KPI 2",
    "KPI 3",
    "KPI 4",
    "KPI 5"
  ],
  "dependencies": [
    "dependency 1 — external system, service, team, or approval needed",
    "dependency 2",
    "dependency 3",
    "dependency 4"
  ]
}

Rules:
- impact and severity must be exactly "High", "Medium", or "Low"
- stakeholders: 4-6 items
- risks: 4-6 items
- successMetrics: 4-6 items
- dependencies: 3-5 items
- Tailor every item to this specific problem — no generic filler.
- Return ONLY valid JSON. No markdown fences, no explanation.`

  const result = await generateJsonWithThinking<InsightOutput>(prompt, onThought)

  if (
    !Array.isArray(result.stakeholders) ||
    !Array.isArray(result.risks) ||
    typeof result.marketContext !== 'string' ||
    !Array.isArray(result.successMetrics) ||
    !Array.isArray(result.dependencies)
  ) {
    throw new Error('Insight Agent: response is missing required fields.')
  }

  return result
}
