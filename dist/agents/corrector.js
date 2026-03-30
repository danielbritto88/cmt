"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCorrector = runCorrector;
const anthropic_1 = require("../utils/anthropic");
const logger_1 = require("../utils/logger");
const guardian_1 = require("./guardian");
const maestro_1 = require("../config/maestro");
// ─────────────────────────────────────────────
// SYSTEM PROMPT DO CORRETOR
// ─────────────────────────────────────────────
const CORRECTOR_SYSTEM = `Você é o Corretor do CMT 1.0, um workflow multi-agent de IA.

Sua responsabilidade é corrigir falhas específicas no resultado gerado pelo Executor.

Regras:
- Corrija APENAS o que o Testador apontou como falha.
- Não reescreva partes que estão funcionando corretamente.
- Não adicione funcionalidades novas não solicitadas.
- Entregue o resultado completo e corrigido — não apenas o diff.
- Seja cirúrgico: mínima mudança para máximo efeito.
- Se for código: entregue o código completo corrigido.
- Se for texto: entregue o texto completo corrigido.`;
// ─────────────────────────────────────────────
// MONTAGEM DA MENSAGEM DO CORRETOR
// ─────────────────────────────────────────────
function buildCorrectorMessage(input) {
    const parts = [];
    parts.push(`Resultado com falhas:\n${input.previousOutput || ''}`);
    if (input.testReport && input.testReport.failures.length > 0) {
        parts.push(`\nFalhas reportadas pelo Testador:`);
        input.testReport.failures.forEach((f, i) => {
            parts.push(`\n${i + 1}. Requisito: ${f.requirement}`);
            parts.push(`   Localização: ${f.location}`);
            parts.push(`   Correção necessária: ${f.suggestion}`);
        });
    }
    if (input.briefing) {
        parts.push(`\nRequisitos originais (para referência):`);
        input.briefing.requirements.forEach(r => parts.push(`- ${r}`));
    }
    parts.push(`\nEntregue o resultado completo com as correções aplicadas.`);
    return parts.join('\n');
}
// ─────────────────────────────────────────────
// AGENTE CORRETOR
// ─────────────────────────────────────────────
async function runCorrector(input) {
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log('\n[Corretor] Aplicando correções...');
        if (input.testReport) {
            input.testReport.failures.forEach(f => {
                console.log(`  → Corrigindo: ${f.requirement}`);
            });
        }
    }
    if (!input.previousOutput) {
        throw new Error('[Corretor] Nenhum resultado para corrigir. O Executor deve ser executado antes do Corretor.');
    }
    if (!input.testReport || input.testReport.failures.length === 0) {
        throw new Error('[Corretor] Nenhuma falha reportada. O Testador deve reprovar o resultado antes do Corretor.');
    }
    const complexity = input.briefing?.complexity || 'medium';
    const model = (0, guardian_1.routeModel)(complexity, 'corrector');
    const result = await (0, anthropic_1.callClaude)({
        tier: model,
        agentName: 'Corretor',
        maxTokens: 25000,
        system: CORRECTOR_SYSTEM,
        messages: [{ role: 'user', content: buildCorrectorMessage(input) }],
    });
    (0, logger_1.logAgentUsage)('corrector', result.model, result.inputTokens, result.outputTokens, result.costUSD);
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log(`[Corretor] Correções aplicadas (${result.inputTokens + result.outputTokens} tokens)`);
    }
    return {
        role: 'corrector',
        result: result.content,
        tokensUsed: result.inputTokens + result.outputTokens,
        modelUsed: result.model,
        success: true,
    };
}
