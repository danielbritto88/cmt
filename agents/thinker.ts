import { callClaude } from '../utils/anthropic';
import { logAgentUsage } from '../utils/logger';
import { AgentInput, Plan, PlanStep } from '../types/index';
import { CMT_CONFIG } from '../config/maestro';

// ─────────────────────────────────────────────
// SYSTEM PROMPT DO PENSADOR
// ─────────────────────────────────────────────

const THINKER_SYSTEM = `Você é o Pensador do CMT 1.0, um workflow multi-agent de IA.

Sua responsabilidade é criar um plano técnico claro para tarefas complexas.
Você recebe um briefing estruturado e decide COMO a tarefa deve ser executada.

Regras:
- Nunca execute a tarefa — apenas planeje.
- Avalie 2 ou 3 abordagens possíveis e escolha a melhor com justificativa clara.
- O plano deve ser específico o suficiente para que o Executor aja sem dúvidas.
- Seja direto. Sem introduções ou conclusões desnecessárias.
- Responda APENAS com um objeto JSON válido, sem markdown, sem blocos de código.

O JSON deve ter exatamente esta estrutura:
{
  "approach": "nome curto da abordagem escolhida",
  "justification": "por que esta abordagem é a melhor (2-3 frases)",
  "steps": [
    { "step": 1, "description": "descrição da etapa", "agent": "executor" },
    { "step": 2, "description": "descrição da etapa", "agent": "executor" }
  ],
  "estimatedTokens": número inteiro
}

Valores válidos para "agent" em cada step: "executor", "tester", "corrector"`;

// ─────────────────────────────────────────────
// PARSING DO PLANO
// ─────────────────────────────────────────────

function parsePlan(raw: string, taskSummary: string): Plan {
    try {
        const parsed = JSON.parse(raw.trim());

        const steps: PlanStep[] = Array.isArray(parsed.steps)
            ? parsed.steps.map((s: { step?: number; description?: string; agent?: string }, i: number) => ({
                step: typeof s.step === 'number' ? s.step : i + 1,
                description: typeof s.description === 'string' ? s.description : 'Etapa sem descrição',
                agent: typeof s.agent === 'string' ? s.agent as PlanStep['agent'] : 'executor',
            }))
            : [{ step: 1, description: taskSummary, agent: 'executor' as const }];

        return {
            approach: typeof parsed.approach === 'string' ? parsed.approach : 'Abordagem direta',
            justification: typeof parsed.justification === 'string' ? parsed.justification : '',
            steps,
            estimatedTokens: typeof parsed.estimatedTokens === 'number' ? parsed.estimatedTokens : 10000,
        };
    } catch {
        // Fallback: plano simples de execução direta
        return {
            approach: 'Execução direta',
            justification: 'Não foi possível gerar plano estruturado. Executando a tarefa diretamente.',
            steps: [{ step: 1, description: taskSummary, agent: 'executor' }],
            estimatedTokens: 10000,
        };
    }
}

// ─────────────────────────────────────────────
// AGENTE PENSADOR
// ─────────────────────────────────────────────

export async function runThinker(input: AgentInput): Promise<Plan> {
    if (CMT_CONFIG.verbose) {
        console.log('\n[Pensador] Elaborando plano técnico...');
    }

    if (!input.briefing) {
        throw new Error('[Pensador] Briefing não encontrado. O Analista deve ser executado antes do Pensador.');
    }

    const briefingText = `
Tarefa original: ${input.task}

Briefing do Analista:
- Tipo: ${input.briefing.taskType}
- Resumo: ${input.briefing.summary}
- Requisitos: ${input.briefing.requirements.join('; ')}
- Riscos: ${input.briefing.risks.join('; ')}
- Complexidade: ${input.briefing.complexity}
- Tokens estimados: ${input.briefing.estimatedTokens}
`.trim();

    const result = await callClaude({
        tier: 'opus',
        agentName: 'Pensador',
        maxTokens: 2000,
        system: THINKER_SYSTEM,
        messages: [{ role: 'user', content: briefingText }],
    });

    logAgentUsage('thinker', result.model, result.inputTokens, result.outputTokens, result.costUSD);

    const plan = parsePlan(result.content, input.briefing.summary);

    if (CMT_CONFIG.verbose) {
        console.log(`[Pensador] Abordagem: ${plan.approach}`);
        console.log(`[Pensador] Etapas: ${plan.steps.length} | Tokens estimados: ${plan.estimatedTokens}`);
    }

    return plan;
}