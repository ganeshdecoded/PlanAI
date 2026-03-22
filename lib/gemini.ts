/**
 * Gemini API client — @google/genai SDK, gemini-2.5-flash.
 *
 * Key design: generateJsonWithThinking() uses generateContentStream() with
 * includeThoughts: true so the caller gets a real-time callback for each
 * thinking token the model produces, while the final JSON is assembled from
 * the non-thought parts only.
 *
 * This is the core technical differentiator:
 *   - The /api/generate route passes an onThought() callback that immediately
 *     SSE-forwards the reasoning snippet to the browser.
 *   - The progress UI renders these live — the user literally watches the AI
 *     plan their problem in real-time, token by token.
 *   - That is not achievable with a single-prompt wrapper.
 *
 * Singleton: lazily initialised so Next.js can build without the env var.
 */

import { GoogleGenAI } from '@google/genai'

let _ai: GoogleGenAI | null = null

function getAI(): GoogleGenAI {
  if (_ai) return _ai
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local',
    )
  }
  _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return _ai
}

export const GEMINI_MODEL = 'gemini-2.5-flash'

// ─── Core generation function ─────────────────────────────────────────────────

/**
 * Streams a prompt to Gemini with thinking enabled.
 *
 * @param prompt     The full prompt string.
 * @param onThought  Optional callback fired with each reasoning snippet as it
 *                   streams in. Snippets are trimmed and capped at 300 chars
 *                   to keep SSE payloads small.
 *
 * Internally this uses generateContentStream so thinking tokens arrive
 * incrementally. The JSON response is assembled from non-thought parts only —
 * mixing the two would produce unparseable output.
 */
export async function generateJsonWithThinking<T>(
  prompt: string,
  onThought?: (snippet: string) => void,
): Promise<T> {
  const ai = getAI()

  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    config: {
      thinkingConfig: {
        thinkingBudget: -1,      // Dynamic: model decides depth of reasoning
        includeThoughts: true,   // Surface reasoning tokens in the stream
      },
      responseMimeType: 'application/json',
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  let jsonText = ''

  for await (const chunk of stream) {
    for (const candidate of chunk.candidates ?? []) {
      for (const part of (candidate.content?.parts ?? []) as Array<{
        thought?: boolean
        text?: string
      }>) {
        if (part.thought && part.text) {
          // Reasoning token — forward a trimmed snippet to the caller
          if (onThought) {
            const snippet = part.text.trim()
            if (snippet.length > 10) {
              onThought(snippet.slice(0, 300))
            }
          }
        } else if (!part.thought && part.text) {
          // Response token — accumulate into the JSON string
          jsonText += part.text
        }
      }
    }
  }

  const cleaned = jsonText.trim()
  if (!cleaned) {
    throw new Error('Gemini returned an empty response.')
  }

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(
      `Gemini returned invalid JSON. First 300 chars: ${cleaned.slice(0, 300)}`,
    )
  }
}

/** Convenience wrapper for callers that don't need the thinking stream. */
export async function generateJson<T>(prompt: string): Promise<T> {
  return generateJsonWithThinking<T>(prompt)
}
