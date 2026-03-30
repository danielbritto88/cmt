"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillValidatePlan = skillValidatePlan;
exports.skillGenerateSimplePlan = skillGenerateSimplePlan;
exports.skillEstimatePlanTokens = skillEstimatePlanTokens;
exports.skillFormatPlan = skillFormatPlan;
exports.skillCompareApproaches = skillCompareApproaches;
// ─────────────────────────────────────────────
// SKILLS DO PENSADOR
// Funções auxiliares de planejamento
// ─────────────────────────────────────────────
// Valida se um plano está completo e bem formado
function skillValidatePlan(plan) {
    return (typeof plan.approach === 'string' &&
        plan.approach.length > 0 &&
        typeof plan.justification === 'string' &&
        plan.justification.length > 0 &&
        Array.isArray(plan.steps) &&
        plan.steps.length > 0 &&
        typeof plan.estimatedTokens === 'number');
}
// Gera um plano simples de fallback para tarefas diretas
function skillGenerateSimplePlan(briefing) {
    const steps = [
        {
            step: 1,
            description: `Executar: ${briefing.summary}`,
            agent: 'executor',
        },
        {
            step: 2,
            description: 'Validar resultado contra os requisitos definidos',
            agent: 'tester',
        },
    ];
    return {
        approach: 'Execução direta',
        justification: 'Tarefa de complexidade baixa ou média — não requer planejamento arquitetural.',
        steps,
        estimatedTokens: briefing.estimatedTokens,
    };
}
// Estima tokens necessários para executar um plano
function skillEstimatePlanTokens(plan) {
    const basePerStep = 3000;
    return plan.steps.length * basePerStep;
}
// Formata o plano para exibição no terminal
function skillFormatPlan(plan) {
    const lines = [];
    lines.push(`Abordagem: ${plan.approach}`);
    lines.push(`Justificativa: ${plan.justification}`);
    lines.push(`Tokens estimados: ${plan.estimatedTokens.toLocaleString()}`);
    lines.push(`\nEtapas:`);
    plan.steps.forEach(step => {
        lines.push(`  ${step.step}. [${step.agent}] ${step.description}`);
    });
    return lines.join('\n');
}
// Compara duas abordagens e retorna a mais adequada
function skillCompareApproaches(approachA, approachB) {
    const scoreA = approachA.pros.length - approachA.cons.length;
    const scoreB = approachB.pros.length - approachB.cons.length;
    return scoreA >= scoreB ? approachA.name : approachB.name;
}
