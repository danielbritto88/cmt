// ─────────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────────

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface ModelConfig {
    haiku: string;
    sonnet: string;
    opus: string;
}

// ─────────────────────────────────────────────
// AGENTES
// ─────────────────────────────────────────────

export type AgentRole =
    | 'orchestrator'
    | 'analyst'
    | 'thinker'
    | 'executor'
    | 'tester'
    | 'corrector'
    | 'guardian';

export interface AgentInput {
    task: string;
    context?: string;
    briefing?: Briefing;
    plan?: Plan;
    previousOutput?: string;
    testReport?: TestReport;
    sessionTokens?: number;
}

export interface AgentOutput {
    role: AgentRole;
    result: string;
    tokensUsed: number;
    modelUsed: string;
    success: boolean;
    error?: string;
}

// ─────────────────────────────────────────────
// TAREFAS
// ─────────────────────────────────────────────

export type TaskType =
    | 'code'
    | 'content'
    | 'analysis'
    | 'saas_automation'
    | 'unknown';

export type ComplexityLevel = 'low' | 'medium' | 'high';

// ─────────────────────────────────────────────
// BRIEFING (output do Analista)
// ─────────────────────────────────────────────

export interface Briefing {
    taskType: TaskType;
    summary: string;
    requirements: string[];
    risks: string[];
    estimatedTokens: number;
    complexity: ComplexityLevel;
    needsThinker: boolean;
}

// ─────────────────────────────────────────────
// PLANO (output do Pensador)
// ─────────────────────────────────────────────

export interface PlanStep {
    step: number;
    description: string;
    agent: AgentRole;
}

export interface Plan {
    approach: string;
    justification: string;
    steps: PlanStep[];
    estimatedTokens: number;
}

// ─────────────────────────────────────────────
// RELATÓRIO DE TESTE (output do Testador)
// ─────────────────────────────────────────────

export type TestStatus = 'approved' | 'failed';

export interface TestFailure {
    requirement: string;
    location: string;
    suggestion: string;
}

export interface TestReport {
    status: TestStatus;
    failures: TestFailure[];
    summary: string;
}

// ─────────────────────────────────────────────
// SESSÃO E CUSTOS
// ─────────────────────────────────────────────

export interface TokenUsage {
    agent: AgentRole;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUSD: number;
}

export interface SessionReport {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUSD: number;
    usageByAgent: TokenUsage[];
    correctionCycles: number;
}

// ─────────────────────────────────────────────
// CACHE DE MODELOS
// ─────────────────────────────────────────────

export interface ModelsCache {
    lastUpdated: string;
    models: ModelConfig;
    pricing: {
        haiku: { inputPer1M: number; outputPer1M: number };
        sonnet: { inputPer1M: number; outputPer1M: number };
        opus: { inputPer1M: number; outputPer1M: number };
    };
}