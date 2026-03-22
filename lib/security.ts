/**
 * Security utilities: rate limiting, input validation, sanitisation.
 *
 * Rate limiting uses an in-memory Map per serverless instance.
 * This is sufficient for a single-instance deployment or demo.
 * For multi-instance production deployments, swap the Map for
 * Upstash Redis (one line change — see comments below).
 *
 * Async / concurrency notes:
 * - All operations are synchronous O(1) Map lookups — safe in Node.js's
 *   single-threaded event loop; no race conditions possible.
 * - A setInterval cleanup runs every 5 minutes to prevent unbounded growth.
 *   It is skipped in test environments to avoid open handles.
 */

import type { NextRequest } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  expiresAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// ─── In-memory store ─────────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>()

// Periodic GC — prevents the Map from growing indefinitely on long-lived instances.
// Skip in test environments (Jest, Vitest) to avoid open handle warnings.
if (process.env.NODE_ENV !== 'test') {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of store) {
        if (now > entry.expiresAt) store.delete(key)
      }
    },
    5 * 60 * 1_000,
  )
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limiter.
 *
 * @param key      Unique key, e.g. `generate:${ip}` — namespace per route.
 * @param limit    Max requests allowed in the window.
 * @param windowMs Window duration in milliseconds.
 *
 * To swap to Upstash Redis, replace the body with:
 *   const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`) })
 *   const { success, remaining, reset } = await ratelimit.limit(key)
 *   return { allowed: success, remaining, resetAt: reset }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.expiresAt) {
    store.set(key, { count: 1, expiresAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.expiresAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.expiresAt }
}

// ─── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP from standard proxy headers.
 * Falls back to 'anonymous' if no headers are present (e.g. local dev).
 */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'
  )
}

// ─── Input sanitisation ───────────────────────────────────────────────────────

/**
 * Strips HTML/script tags and normalises whitespace.
 * Hard-caps at 2 000 characters to prevent prompt injection via long inputs.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 2_000)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
}

// ─── Validators ───────────────────────────────────────────────────────────────

export interface ValidationResult<T = undefined> {
  valid: boolean
  error?: string
  data?: T
}

export function validateProblemStatement(
  problem: unknown,
): ValidationResult {
  if (!problem || typeof problem !== 'string') {
    return { valid: false, error: 'Problem statement is required and must be a string.' }
  }
  if (problem.trim().length < 10) {
    return { valid: false, error: 'Problem statement is too short (minimum 10 characters).' }
  }
  if (problem.length > 2_000) {
    return { valid: false, error: 'Problem statement is too long (maximum 2 000 characters).' }
  }
  return { valid: true }
}

export function validateEditRequest(body: unknown): ValidationResult<{
  section: string
  currentContent: unknown
  instruction: string
}> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (!b.section || typeof b.section !== 'string') {
    return { valid: false, error: 'section field is required.' }
  }
  if (!b.instruction || typeof b.instruction !== 'string') {
    return { valid: false, error: 'instruction field is required.' }
  }
  if (b.instruction.trim().length < 3) {
    return { valid: false, error: 'instruction is too short.' }
  }
  if (b.instruction.length > 500) {
    return { valid: false, error: 'instruction is too long (max 500 characters).' }
  }

  return {
    valid: true,
    data: {
      section: b.section,
      currentContent: b.currentContent,
      instruction: sanitizeInput(b.instruction),
    },
  }
}

export function validateReportData(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid report data.' }
  }
  const b = body as Record<string, unknown>
  if (!b.problemStatement || !b.problemBreakdown) {
    return { valid: false, error: 'Report is missing required fields.' }
  }
  return { valid: true }
}
