# PlanAI — AI Planning Agent

A Next.js application that runs a **three-agent AI pipeline** powered by **Gemini 2.5 Flash** to turn any problem statement into a structured, editable, exportable execution plan — with live reasoning visible on screen.

---

## Live Demo

> Add your Vercel URL here after deployment.

---

## Features

| Feature | Detail |
|---|---|
| **3-Agent Pipeline** | Planner → Insight → Execution (sequential, context-chained) |
| **Live Thinking Stream** | Gemini 2.5 Flash's internal reasoning streamed to the UI in real-time |
| **SSE Progress** | Server-Sent Events show each agent's status and intermediate output |
| **Structured Report** | Problem Breakdown, Stakeholders, Solution Approach, Action Plan |
| **AI Section Editing** | Edit any section with a natural-language instruction |
| **Version History** | Per-section undo of AI edits |
| **DOCX Export** | Formatted Word document — server-side via `docx` |
| **PDF Export** | Multi-page PDF with tables — server-side via `pdfkit` |
| **Auto-Save** | Report persisted to `localStorage` — survives page refresh |
| **Rate Limiting** | Per-IP sliding window on every API route |
| **Input Security** | Sanitisation, HTML stripping, length caps, prompt injection prevention |

---

## Agent Architecture

```
User Problem Statement
        │
        ▼
┌──────────────────────────────────────────────────┐
│  PLANNER AGENT  (Step 1)                         │
│                                                  │
│  Input:  Raw problem string                      │
│  Task:   Decompose into components, goals,       │
│          scope, constraints, key questions       │
│  Output: PlannerOutput JSON                      │
│  Thinking: streamed live to browser              │
└─────────────────────┬────────────────────────────┘
                      │  Full PlannerOutput injected into next prompt
                      ▼
┌──────────────────────────────────────────────────┐
│  INSIGHT AGENT  (Step 2)                         │
│                                                  │
│  Input:  Problem + PlannerOutput                 │
│  Task:   Map stakeholders, assess risks,         │
│          derive market context, KPIs,            │
│          and external dependencies               │
│  Output: InsightOutput JSON                      │
│  Thinking: streamed live to browser              │
└─────────────────────┬────────────────────────────┘
                      │  PlannerOutput + InsightOutput injected into next prompt
                      ▼
┌──────────────────────────────────────────────────┐
│  EXECUTION AGENT  (Step 3)                       │
│                                                  │
│  Input:  Problem + PlannerOutput + InsightOutput │
│  Task:   Synthesise a complete execution report  │
│          with 4-5 structured action phases       │
│  Output: Full ReportData JSON                    │
│  Thinking: streamed live to browser              │
└──────────────────────────────────────────────────┘
```

### Why sequential context-chaining?

Each agent embeds the **complete output of all previous agents** in its prompt:

- The Insight Agent does not re-derive the problem components — it reads them from the Planner.
- The Execution Agent does not re-derive stakeholders — it refines them from the Insight Agent.
- Each agent specialises: **Decompose → Enrich → Synthesise**.

Running them in parallel would break this property. The context-chain is what makes the pipeline qualitatively different from a single large prompt — it produces coherent, cross-referenced output where every section is aware of every other.

### Live thinking stream

Every agent uses `generateContentStream` with `includeThoughts: true`. Gemini 2.5 Flash's internal reasoning tokens are separated from the JSON response tokens and forwarded to the browser via SSE in real-time — so you can watch the model reason before it writes a single word of the report.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| AI SDK | `@google/genai` (new unified Google AI SDK) |
| AI Model | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| DOCX | `docx` — pure Node.js, server-side |
| PDF | `pdfkit` — pure Node.js, server-side, no Puppeteer |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Deployment | Vercel |

---

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── generate/route.ts     ← SSE orchestrator: runs 3 agents, streams thoughts
│   │   ├── edit/route.ts         ← AI section re-processing (section-level only)
│   │   └── export/
│   │       ├── docx/route.ts     ← Returns .docx binary
│   │       └── pdf/route.ts      ← Returns .pdf binary
│   ├── report/page.tsx           ← Report display (reads from localStorage)
│   ├── layout.tsx                ← Root layout + static metadata
│   ├── page.tsx                  ← Landing + SSE stream consumer
│   └── globals.css               ← Tailwind v4 + custom keyframes
├── components/
│   ├── AgentProgress.tsx         ← Live thinking panel + step tracker
│   ├── EditModal.tsx             ← AI edit modal with quick actions + history
│   ├── ExportBar.tsx             ← Sticky DOCX/PDF export bar
│   ├── ProblemInput.tsx          ← Landing input form
│   ├── ReportView.tsx            ← Report layout with scrollspy section nav
│   └── SectionCard.tsx           ← Section card with edit, undo, accordion
└── lib/
    ├── agents/
    │   ├── planner.ts            ← Planner Agent (accepts onThought callback)
    │   ├── insight.ts            ← Insight Agent (accepts onThought callback)
    │   └── execution.ts          ← Execution Agent (accepts onThought callback)
    ├── export/
    │   ├── docx.ts               ← Full DOCX builder with tables and headings
    │   └── pdf.ts                ← Full PDF builder with colours and layout
    ├── gemini.ts                 ← generateJsonWithThinking() — core stream function
    ├── security.ts               ← Rate limiter, input validation, sanitisation
    └── types.ts                  ← Shared TypeScript types
```

---

## API Reference

### `POST /api/generate`

Runs the three-agent pipeline. Returns an **SSE stream** (`text/event-stream`).

**Request body:**
```json
{ "problem": "Build a creator marketplace platform" }
```

**Stream events** — each line is `data: <json>\n\n`. Every event carries a `type` field:

| `type` | Purpose |
|---|---|
| `"status"` | Agent lifecycle update (started, done, error) |
| `"thought"` | Live reasoning snippet from Gemini's thinking stream |

```jsonc
// Lifecycle events (type: "status")
{ "step": "planner",   "status": "running", "type": "status", "message": "Analysing problem structure..." }
{ "step": "planner",   "status": "done",    "type": "status", "message": "Found 6 components, 4 goals", "data": { ...PlannerOutput } }
{ "step": "insight",   "status": "running", "type": "status", "message": "Mapping stakeholders and risks..." }
{ "step": "insight",   "status": "done",    "type": "status", "message": "Identified 5 stakeholders, 5 risks", "data": { ...InsightOutput } }
{ "step": "execution", "status": "running", "type": "status", "message": "Synthesising execution report..." }
{ "step": "execution", "status": "done",    "type": "status", "message": "Report complete — 4 action phases", "data": { ...ReportData } }
{ "step": "complete",  "status": "done",    "type": "status", "message": "All agents complete.", "data": { ...ReportData } }

// Thinking events — fire continuously while each agent runs (type: "thought")
{ "step": "planner",   "status": "running", "type": "thought", "message": "The creator marketplace problem involves two-sided network effects..." }
{ "step": "insight",   "status": "running", "type": "thought", "message": "Key stakeholders are creators, brands, and the platform operator..." }
```

**Rate limit:** 5 req/min per IP. Response headers include `X-RateLimit-Remaining`.

---

### `POST /api/edit`

Re-processes a single report section with a natural-language instruction.
Only the target section's JSON is sent to Gemini — not the full report.

**Request body:**
```json
{
  "section": "solutionApproach",
  "currentContent": { "overview": "...", "strategy": "..." },
  "instruction": "Make this more detailed with specific timelines"
}
```

**Response:**
```json
{ "updated": { "overview": "...", "strategy": "..." } }
```

The response preserves the exact same JSON structure so the UI can do a drop-in replacement.

**Rate limit:** 20 req/min per IP.

---

### `POST /api/export/docx`

Accepts the full `ReportData` JSON body. Returns a `.docx` binary.

**Response headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="ai-plan-<id>.docx"
Cache-Control: no-store
```

**Rate limit:** 10 req/min per IP.

---

### `POST /api/export/pdf`

Accepts the full `ReportData` JSON body. Returns a `.pdf` binary.

**Response headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="ai-plan-<id>.pdf"
Cache-Control: no-store
```

**Rate limit:** 10 req/min per IP.

---

## Security

### Input Sanitisation
- Problem statements and edit instructions are stripped of HTML tags and `<script>` blocks before being embedded in any Gemini prompt.
- Hard cap: 2 000 characters for problem statements, 500 characters for instructions — prevents prompt injection via excessively long payloads.
- `currentContent` is `JSON.stringify`-d before embedding in edit prompts so user-controlled string values cannot escape the JSON context and inject new prompt instructions.

### Rate Limiting
- In-memory sliding window per `route:ip` key. Each route has its own namespace so hitting the edit limit does not affect generation.
- Different limits reflect cost: `/generate` is strictest (5/min), `/edit` is most lenient (20/min).
- **To scale across multiple serverless instances:** replace the `Map` in `lib/security.ts` with Upstash Redis — there is a comment in the source marking exactly where to make the swap.

### API Key Safety
- `GEMINI_API_KEY` is read only in server-side code (`lib/gemini.ts`). It is never imported into any client component and never included in any API response.
- The Gemini client is lazily initialised — if the key is missing the error surfaces at request time with a clear message, not at build time.

### Error Handling
- In `NODE_ENV=development` — real error messages are forwarded so you can debug.
- In production — all internal errors (Gemini failures, parsing errors) return a generic safe message. Stack traces never reach the client.

### Export Safety
- `Content-Disposition: attachment` on all export routes — browsers cannot render the file inline, only download it.
- `Cache-Control: no-store` — CDN edges and shared proxies will not cache potentially sensitive report data.

---

## Performance Optimisations

### 1. Thinking stream via `generateContentStream`
Each agent uses `generateContentStream` with `includeThoughts: true` instead of `generateContent`. This means:
- Gemini's reasoning tokens arrive incrementally as the model thinks.
- The thinking tokens are separated from the JSON response tokens in the stream.
- Both are processed in real-time: thoughts go to the SSE progress feed, JSON accumulates into the final response string.
- The user sees the AI reasoning appear live — perceived latency is dramatically lower than waiting for the full response.

### 2. Throttled SSE thought events
A `makeThoughtSender` closure in `/api/generate` throttles thought events to one per 150 ms per agent. Without throttling, Gemini emits dozens of tiny chunks per second which would flood the SSE stream and cause React state updates faster than the browser can render. 150 ms gives a smooth, readable stream.

### 3. JSON mode (`responseMimeType: 'application/json'`)
Guarantees a parseable JSON response on the first attempt. Without this, the model may wrap output in markdown fences requiring regex stripping, and occasionally returns malformed JSON requiring a full retry — adding 2–5 seconds of latency per agent.

### 4. Dynamic thinking budget (`thinkingBudget: -1`)
Value `-1` means the model adaptively allocates reasoning tokens based on prompt complexity. Simple prompts get less thinking (faster), complex prompts get more (higher quality). A fixed budget would either be too low for hard problems or wastefully slow for easy ones.

### 5. Lazy Gemini singleton
`GoogleGenAI` is instantiated once and cached in a module-level variable. Subsequent requests within the same warm serverless instance reuse it, avoiding re-initialisation overhead and allowing the HTTP connection pool to be reused.

### 6. Section-only editing
`/api/edit` sends only the target section's JSON (~0.5–2 KB) to Gemini instead of the full report (~15–30 KB). This reduces token usage by ~10–20x, cutting edit latency from ~15s to ~3s and reducing API costs proportionally.

### 7. `localStorage` auto-save
The completed report is saved to `localStorage` before navigation to `/report`. Every AI edit also re-saves. On page refresh, the report is restored from `localStorage` instantly — no server round-trip, no re-generation.

### 8. No Puppeteer for PDF
`pdfkit` is a pure Node.js PDF library. Alternatives like Puppeteer or headless Chrome add ~100 MB to the serverless bundle and introduce cold-start delays of 3–8 seconds. `pdfkit` is <5 MB and starts in milliseconds.

### 9. `pdfkit` as a server external package
`next.config.ts` marks `pdfkit` as `serverExternalPackages` so Next.js does not bundle it. This lets `pdfkit` use `__dirname`-relative paths to load its font AFM files — without this, font loading fails silently and the PDF route returns 500.

### 10. Static metadata + `display: swap`
`layout.tsx` exports a static `metadata` object rendered at build time — zero JS runtime cost for SEO and Open Graph tags. Fonts use `display: 'swap'` to prevent FOIT (Flash of Invisible Text) on slower connections.

---

## Getting Started

### Prerequisites
- Node.js 18 or later
- A Google Gemini API key — [get one free at Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd my-app
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your key:

```
GEMINI_API_KEY=your_key_here
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

Then add the environment variable — either in the Vercel dashboard under **Settings → Environment Variables**, or via CLI:

```bash
vercel env add GEMINI_API_KEY
```

**Important — function timeout:**
The `/api/generate` route has `maxDuration = 120` seconds. Vercel's **Hobby** plan caps function duration at **60 seconds**. If generation times out on Hobby, either:
- Upgrade to Vercel Pro (recommended), or
- Switch `thinkingBudget` from `-1` to `0` in `lib/gemini.ts` to disable thinking and reduce latency.

---

## How Editing Works

Each report section has an **"Edit with AI"** button that opens a modal:

1. **Quick actions** — one-click instructions: "More detailed", "Professional tone", "Shorter", "Bullet points", etc.
2. **Custom instruction** — free-text field for any instruction.
3. **Undo** — reverts the section to its state before the last edit.
4. **History** — shows a timestamped log of every edit made to that section.

Under the hood, `/api/edit` receives only the target section's JSON + the instruction. Gemini rewrites it preserving the exact field structure. The UI swaps the section in place — no full report re-generation.

---

## How the Thinking Stream Works (Technical)

```
lib/gemini.ts  generateJsonWithThinking()
│
├── calls ai.models.generateContentStream({ includeThoughts: true })
│
└── for each chunk:
    ├── if part.thought === true  → call onThought(snippet)   ← reasoning
    └── if part.thought !== true → accumulate into jsonText   ← response
        │
        └── at stream end: JSON.parse(jsonText) → return typed result

app/api/generate/route.ts
│
├── makeThoughtSender('planner')  → throttled SSE sender (150ms)
├── runPlanner(problem, thoughtSender)
│   └── generates, streaming thoughts to SSE as "type: thought" events
│
├── makeThoughtSender('insight')
├── runInsight(problem, plannerOutput, thoughtSender)
│
├── makeThoughtSender('execution')
└── runExecution(problem, plannerOutput, insightOutput, thoughtSender)

components/AgentProgress.tsx
└── renders step.thought in a live "Thinking" panel per agent card
    └── updated by patchStep() in app/page.tsx on every SSE thought event
```

---

## License

MIT
