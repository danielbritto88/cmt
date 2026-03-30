import { Plan, PlanStep, Briefing } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO PENSADOR
// Funções auxiliares de planejamento
// ─────────────────────────────────────────────

// Valida se um plano está completo e bem formado
export function skillValidatePlan(plan: Partial<Plan>): boolean {
    return (
        typeof plan.approach === 'string' &&
        plan.approach.length > 0 &&
        typeof plan.justification === 'string' &&
        plan.justification.length > 0 &&
        Array.isArray(plan.steps) &&
        plan.steps.length > 0 &&
        typeof plan.estimatedTokens === 'number'
    );
}

// Gera um plano simples de fallback para tarefas diretas
export function skillGenerateSimplePlan(briefing: Briefing): Plan {
    const steps: PlanStep[] = [
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
export function skillEstimatePlanTokens(plan: Plan): number {
    const basePerStep = 3000;
    return plan.steps.length * basePerStep;
}

// Formata o plano para exibição no terminal
export function skillFormatPlan(plan: Plan): string {
    const lines: string[] = [];

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
export function skillCompareApproaches(
    approachA: { name: string; pros: string[]; cons: string[] },
    approachB: { name: string; pros: string[]; cons: string[] }
): string {
    const scoreA = approachA.pros.length - approachA.cons.length;
    const scoreB = approachB.pros.length - approachB.cons.length;
    return scoreA >= scoreB ? approachA.name : approachB.name;
}