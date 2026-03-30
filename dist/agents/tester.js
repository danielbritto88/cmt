"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTester = runTester;
const anthropic_1 = require("../utils/anthropic");
const logger_1 = require("../utils/logger");
const guardian_1 = require("./guardian");
const maestro_1 = require("../config/maestro");
// ─────────────────────────────────────────────
// SYSTEM PROMPT DO TESTADOR
// ─────────────────────────────────────────────
const TESTER_SYSTEM = `Você é o Testador do CMT 1.0, um workflow multi-agent de IA.

Sua responsabilidade é validar se o resultado gerado pelo Executor atende aos requisitos originais.

Regras:
- Compare o resultado com cada requisito do briefing.
- Seja objetivo e específico. Nunca reporte falhas vagas como "poderia ser melhor".
- Se o resultado atende a todos os requisitos: status = "approved".
- Se qualquer requisito não foi atendido: status = "failed" com falhas detalhadas.
- Responda APENAS com um objeto JSON válido, sem markdown, sem blocos de código.

O JSON deve ter exatamente esta estrutura:
{
  "status": "approved" | "failed",
  "summary": "resumo da validação em 1-2 frases",
  "failures": [
    {
      "requirement": "qual requisito não foi atendido",
      "location": "onde no resultado está o problema (linha, função, seção)",
      "suggestion": "o que deve ser corrigido especificamente"
    }
  ]
}

Se status = "approved", failures deve ser um array vazio [].
Se status = "failed", failures deve ter pelo menos uma entrada.`;
// ─────────────────────────────────────────────
// PARSING DO RELATÓRIO
// ─────────────────────────────────────────────
function parseTestReport(raw) {
    try {
        const parsed = JSON.parse(raw.trim());
        const validStatus = ['approved', 'failed'];
        const status = validStatus.includes(parsed.status) ? parsed.status : 'failed';
        const failures = Array.isArray(parsed.failures)
            ? parsed.failures.map((f) => ({
                requirement: typeof f.requirement === 'string' ? f.requirement : 'Requisito não especificado',
                location: typeof f.location === 'string' ? f.location : 'Localização não identificada',
                suggestion: typeof f.suggestion === 'string' ? f.suggestion : 'Revisar o resultado',
            }))
            : [];
        return {
            status,
            summary: typeof parsed.summary === 'string' ? parsed.summary : '',
            failures,
        };
    }
    catch {
        return {
            status: 'failed',
            summary: 'Não foi possível analisar o relatório do Testador.',
            failures: [{
                    requirement: 'Formato do relatório',
                    location: 'Output do Testador',
                    suggestion: 'O Testador retornou um formato inválido. Tentar novamente.',
                }],
        };
    }
}
// ─────────────────────────────────────────────
// MONTAGEM DA MENSAGEM DO TESTADOR
// ─────────────────────────────────────────────
function buildTesterMessage(input) {
    const parts = [];
    if (input.briefing) {
        parts.push(`Requisitos originais:`);
        input.briefing.requirements.forEach(r => parts.push(`- ${r}`));
    }
    parts.push(`\nResultado a validar:\n${input.previousOutput || ''}`);
    return parts.join('\n');
}
// ─────────────────────────────────────────────
// AGENTE TESTADOR
// ─────────────────────────────────────────────
async function runTester(input) {
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log('\n[Testador] Validando resultado...');
    }
    if (!input.previousOutput) {
        throw new Error('[Testador] Nenhum resultado para validar. O Executor deve ser executado antes do Testador.');
    }
    const complexity = input.briefing?.complexity || 'medium';
    const model = (0, guardian_1.routeModel)(complexity, 'tester');
    const result = await (0, anthropic_1.callClaude)({
        tier: model,
        agentName: 'Testador',
        maxTokens: 1000,
        system: TESTER_SYSTEM,
        messages: [{ role: 'user', content: buildTesterMessage(input) }],
    });
    (0, logger_1.logAgentUsage)('tester', result.model, result.inputTokens, result.outputTokens, result.costUSD);
    const report = parseTestReport(result.content);
    if (maestro_1.CMT_CONFIG.verbose) {
        if (report.status === 'approved') {
            console.log(`[Testador] ✓ APROVADO — ${report.summary}`);
        }
        else {
            console.log(`[Testador] ✗ FALHOU — ${report.failures.length} problema(s) encontrado(s)`);
            report.failures.forEach(f => {
                console.log(`  → ${f.requirement}: ${f.suggestion}`);
            });
        }
    }
    return report;
}
