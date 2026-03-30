import { callClaude } from '../utils/anthropic';
import { logAgentUsage, getTotalTokens } from '../utils/logger';
import { ModelTier, ComplexityLevel } from '../types/index';
import { TASK_LIMITS, SESSION_ALERT_THRESHOLD } from '../config/limits';
import { CMT_CONFIG } from '../config/maestro';

// ─────────────────────────────────────────────
// ROTEAMENTO DE MODELO
// ─────────────────────────────────────────────

export function routeModel(complexity: ComplexityLevel, agentRole: string): ModelTier {
    // Guardião e Analista sempre usam Haiku
    if (agentRole === 'guardian' || agentRole === 'analyst') return 'haiku';

    // Pensador sempre usa Opus
    if (agentRole === 'thinker') return 'opus';

    // Demais agentes: decide por complexidade
    if (complexity === 'low') return 'haiku';
    if (complexity === 'high') return 'opus';
    return 'sonnet';
}

// ─────────────────────────────────────────────
// CONTAGEM DE TOKENS (estimativa local)
// ─────────────────────────────────────────────

export function estimateTokens(text: string): number {
    // Estimativa: 1 token ≈ 4 caracteres
    return Math.ceil(text.length / 4);
}

// ─────────────────────────────────────────────
// VERIFICAÇÃO DE LIMITE
// ─────────────────────────────────────────────

export function checkSessionLimit(): void {
    const total = getTotalTokens();

    if (CMT_CONFIG.tokenHardStop > 0 && total >= CMT_CONFIG.tokenHardStop) {
        console.error(`\n[Guardião] 🛑 Limite absoluto de tokens atingido (${total.toLocaleString()}). Encerrando.`);
        process.exit(1);
    }

    if (total >= SESSION_ALERT_THRESHOLD) {
        console.warn(`\n[Guardião] ⚠️  Sessão com ${total.toLocaleString()} tokens consumidos.`);
    }
}

// ─────────────────────────────────────────────
// COMPRESSÃO DE CONTEXTO
// ─────────────────────────────────────────────

export async function compressContext(context: string): Promise<string> {
    const estimatedTokens = estimateTokens(context);

    // Só comprime se o contexto for grande o suficiente
    if (estimatedTokens < 2000) return context;

    if (CMT_CONFIG.verbose) {
        console.log(`[Guardião] Comprimindo contexto (${estimatedTokens} tokens estimados)...`);
    }

    const result = await callClaude({
        tier: 'haiku',
        agentName: 'Guardião',
        maxTokens: 1000,
        system: `Você é um compressor de contexto. 
Recebe um texto longo e retorna um resumo estruturado e conciso com as informações essenciais.
Preserve: decisões tomadas, requisitos definidos, problemas encontrados, estado atual.
Descarte: explicações longas, repetições, conversas de alinhamento.
Responda apenas com o resumo — sem introdução nem comentários.`,
        messages: [{ role: 'user', content: `Comprima este contexto:\n\n${context}` }],
    });

    logAgentUsage('guardian', result.model, result.inputTokens, result.outputTokens, result.costUSD);

    return result.content;
}

// ─────────────────────────────────────────────
// AVALIAÇÃO ANTES DE ACIONAR AGENTE
// ─────────────────────────────────────────────

export function guardianCheck(
    agentRole: string,
    complexity: ComplexityLevel,
    contextSize: number
): { model: ModelTier; proceed: boolean; reason?: string } {
    checkSessionLimit();

    const model = routeModel(complexity, agentRole);
    const taskType = 'unknown';
    const limit = TASK_LIMITS[taskType].maxTokens;

    if (contextSize > limit * 2) {
        return {
            model,
            proceed: false,
            reason: `Contexto muito grande (${contextSize} tokens estimados). Compressão necessária antes de continuar.`,
        };
    }

    return { model, proceed: true };
}