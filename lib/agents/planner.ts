/**
 * Planner Agent — Step 1 of the agentic pipeline.
 *
 * Responsibility: Decompose the raw problem statement into structured
 * components, goals, scope, constraints, and key questions.
 *
 * This output is consumed by the Insight Agent in step 2.
 *
 * Design note: Using Gemini's JSON mode (responseMimeType: 'application/json')
 * guarantees a parseable response without needing regex/markdown stripping,
 * which removes a whole class of retry-worthy failures.
 */

import { generateJsonWithThinking } from '../gemini'
import type { PlannerOutput } from '../types'

export async function runPlanner(
  problem: string,
  onThought?: (snippet: string) => void,
): Promise<PlannerOutput> {
  const prompt = `You are a strategic planning AI agent. Your sole task is to analyse a problem statement and decompose it into its fundamental components.

Problem Statement:
"${problem}"

Think carefully about this specific problem. Then return a JSON object with EXACTLY this shape:

{
  "components": [
    "component 1 — a distinct functional area of the problem",
    "component 2",
    "component 3",
    "component 4",
    "component 5"
  ],
  "goals": [
    "goal 1 — specific and measurable",
    "goal 2",
    "goal 3",
    "goal 4"
  ],
  "scope": "2-3 sentences clearly defining what is IN scope and what is explicitly OUT of scope for this problem.",
  "constraints": [
    "constraint 1 — a real limitation (budget, time, tech, regulation, etc.)",
    "constraint 2",
    "constraint 3",
    "constraint 4"
  ],
  "keyQuestions": [
    "question 1 — a critical unknown that must be resolved to succeed",
    "question 2",
    "question 3",
    "question 4",
    "question 5"
  ]
}

Rules:
- Be SPECIFIC to the actual problem. No generic placeholder text.
- components: 5-7 items
- goals: 3-5 items
- constraints: 3-5 items
- keyQuestions: 4-6 items
- Return ONLY valid JSON. No markdown fences, no explanation text.`

  const result = await generateJsonWithThinking<PlannerOutput>(prompt, onThought)

  // Structural validation — fail fast with a clear message
  if (
    !Array.isArray(result.components) ||
    !Array.isArray(result.goals) ||
    typeof result.scope !== 'string' ||
    !Array.isArray(result.constraints) ||
    !Array.isArray(result.keyQuestions)
  ) {
    throw new Error('Planner Agent: response is missing required fields.')
  }

  return result
}
