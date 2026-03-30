"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeModel = routeModel;
exports.estimateTokens = estimateTokens;
exports.checkSessionLimit = checkSessionLimit;
exports.compressContext = compressContext;
exports.guardianCheck = guardianCheck;
const anthropic_1 = require("../utils/anthropic");
const logger_1 = require("../utils/logger");
const limits_1 = require("../config/limits");
const maestro_1 = require("../config/maestro");
// ─────────────────────────────────────────────
// ROTEAMENTO DE MODELO
// ─────────────────────────────────────────────
function routeModel(complexity, agentRole) {
    // Guardião e Analista sempre usam Haiku
    if (agentRole === 'guardian' || agentRole === 'analyst')
        return 'haiku';
    // Pensador sempre usa Opus
    if (agentRole === 'thinker')
        return 'opus';
    // Demais agentes: decide por complexidade
    if (complexity === 'low')
        return 'haiku';
    if (complexity === 'high')
        return 'opus';
    return 'sonnet';
}
// ─────────────────────────────────────────────
// CONTAGEM DE TOKENS (estimativa local)
// ─────────────────────────────────────────────
function estimateTokens(text) {
    // Estimativa: 1 token ≈ 4 caracteres
    return Math.ceil(text.length / 4);
}
// ─────────────────────────────────────────────
// VERIFICAÇÃO DE LIMITE
// ─────────────────────────────────────────────
function checkSessionLimit() {
    const total = (0, logger_1.getTotalTokens)();
    if (maestro_1.CMT_CONFIG.tokenHardStop > 0 && total >= maestro_1.CMT_CONFIG.tokenHardStop) {
        console.error(`\n[Guardião] 🛑 Limite absoluto de tokens atingido (${total.toLocaleString()}). Encerrando.`);
        process.exit(1);
    }
    if (total >= limits_1.SESSION_ALERT_THRESHOLD) {
        console.warn(`\n[Guardião] ⚠️  Sessão com ${total.toLocaleString()} tokens consumidos.`);
    }
}
// ─────────────────────────────────────────────
// COMPRESSÃO DE CONTEXTO
// ─────────────────────────────────────────────
async function compressContext(context) {
    const estimatedTokens = estimateTokens(context);
    // Só comprime se o contexto for grande o suficiente
    if (estimatedTokens < 2000)
        return context;
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log(`[Guardião] Comprimindo contexto (${estimatedTokens} tokens estimados)...`);
    }
    const result = await (0, anthropic_1.callClaude)({
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
    (0, logger_1.logAgentUsage)('guardian', result.model, result.inputTokens, result.outputTokens, result.costUSD);
    return result.content;
}
// ─────────────────────────────────────────────
// AVALIAÇÃO ANTES DE ACIONAR AGENTE
// ─────────────────────────────────────────────
function guardianCheck(agentRole, complexity, contextSize) {
    checkSessionLimit();
    const model = routeModel(complexity, agentRole);
    const taskType = 'unknown';
    const limit = limits_1.TASK_LIMITS[taskType].maxTokens;
    if (contextSize > limit * 2) {
        return {
            model,
            proceed: false,
            reason: `Contexto muito grande (${contextSize} tokens estimados). Compressão necessária antes de continuar.`,
        };
    }
    return { model, proceed: true };
}
