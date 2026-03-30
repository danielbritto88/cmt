"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_TOKEN_LIMITS = exports.MAX_CORRECTION_CYCLES = exports.SESSION_HARD_STOP = exports.SESSION_ALERT_THRESHOLD = exports.TASK_LIMITS = void 0;
exports.TASK_LIMITS = {
    analysis: { maxTokens: 8_000, defaultModel: 'haiku' },
    code: { maxTokens: 25_000, defaultModel: 'sonnet' },
    content: { maxTokens: 15_000, defaultModel: 'sonnet' },
    saas_automation: { maxTokens: 30_000, defaultModel: 'sonnet' },
    unknown: { maxTokens: 10_000, defaultModel: 'sonnet' },
};
// ─────────────────────────────────────────────
// LIMITES GLOBAIS DA SESSÃO
// ─────────────────────────────────────────────
exports.SESSION_ALERT_THRESHOLD = parseInt(process.env.TOKEN_ALERT_THRESHOLD || '100000');
exports.SESSION_HARD_STOP = parseInt(process.env.MAX_TOKENS_HARD_STOP || '0'); // 0 = desativado
exports.MAX_CORRECTION_CYCLES = parseInt(process.env.MAX_CORRECTION_CYCLES || '3');
// ─────────────────────────────────────────────
// LIMITES POR AGENTE
// ─────────────────────────────────────────────
exports.AGENT_TOKEN_LIMITS = {
    orchestrator: 2_000,
    analyst: 4_000,
    thinker: 60_000,
    executor: 25_000,
    tester: 8_000,
    corrector: 15_000,
    guardian: 1_000,
};
