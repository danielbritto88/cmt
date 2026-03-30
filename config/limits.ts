import { TaskType, ModelTier } from '../types/index';

// ─────────────────────────────────────────────
// LIMITE POR TIPO DE TAREFA
// ─────────────────────────────────────────────

export interface TaskLimit {
    maxTokens: number;
    defaultModel: ModelTier;
}

export const TASK_LIMITS: Record<TaskType, TaskLimit> = {
    analysis: { maxTokens: 8_000, defaultModel: 'haiku' },
    code: { maxTokens: 25_000, defaultModel: 'sonnet' },
    content: { maxTokens: 15_000, defaultModel: 'sonnet' },
    saas_automation: { maxTokens: 30_000, defaultModel: 'sonnet' },
    unknown: { maxTokens: 10_000, defaultModel: 'sonnet' },
};

// ─────────────────────────────────────────────
// LIMITES GLOBAIS DA SESSÃO
// ─────────────────────────────────────────────

export const SESSION_ALERT_THRESHOLD =
    parseInt(process.env.TOKEN_ALERT_THRESHOLD || '100000');

export const SESSION_HARD_STOP =
    parseInt(process.env.MAX_TOKENS_HARD_STOP || '0'); // 0 = desativado

export const MAX_CORRECTION_CYCLES =
    parseInt(process.env.MAX_CORRECTION_CYCLES || '3');

// ─────────────────────────────────────────────
// LIMITES POR AGENTE
// ─────────────────────────────────────────────

export const AGENT_TOKEN_LIMITS: Record<string, number> = {
    orchestrator: 2_000,
    analyst: 4_000,
    thinker: 60_000,
    executor: 25_000,
    tester: 8_000,
    corrector: 15_000,
    guardian: 1_000,
};