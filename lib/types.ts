// ─── Shared TypeScript types for the AI Planning Agent ────────────────────────

export interface Stakeholder {
  name: string
  role: string
  interests: string
  impact: 'High' | 'Medium' | 'Low'
}

export interface Risk {
  risk: string
  severity: 'High' | 'Medium' | 'Low'
  mitigation: string
}

export interface ActionPhase {
  phase: string
  tasks: string[]
  deliverables: string[]
  timeline: string
}

// ─── Agent-level output types ────────────────────────────────────────────────

export interface PlannerOutput {
  components: string[]
  goals: string[]
  scope: string
  constraints: string[]
  keyQuestions: string[]
}

export interface InsightOutput {
  stakeholders: Stakeholder[]
  risks: Risk[]
  marketContext: string
  successMetrics: string[]
  dependencies: string[]
}

export interface ReportSection {
  problemBreakdown: {
    summary: string
    components: string[]
    goals: string[]
    scope: string
    constraints: string[]
  }
  stakeholders: Stakeholder[]
  solutionApproach: {
    overview: string
    strategy: string
    techStack: string[]
    methodology: string
    risks: Risk[]
  }
  actionPlan: ActionPhase[]
}

export interface ReportData extends ReportSection {
  id: string
  problemStatement: string
  generatedAt: string
}

// ─── SSE event types ─────────────────────────────────────────────────────────

export interface AgentProgressEvent {
  step: 'planner' | 'insight' | 'execution' | 'complete' | 'error'
  status: 'running' | 'done' | 'error'
  /** 'status' = lifecycle update, 'thought' = live reasoning snippet from Gemini */
  type: 'status' | 'thought'
  message: string
  data?: unknown
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export interface AgentStep {
  step: 'planner' | 'insight' | 'execution'
  label: string
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
  /** Last status message */
  message: string
  /** Latest live thought snippet from Gemini */
  thought: string
  /** Snapshot of what this agent produced (for the expandable preview) */
  preview: string | null
}

export interface SectionVersion {
  content: unknown
  timestamp: string
  instruction: string
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface EditRequest {
  section: string
  currentContent: unknown
  instruction: string
}

export interface EditResponse {
  updated: unknown
}

export interface GenerateRequest {
  problem: string
}
