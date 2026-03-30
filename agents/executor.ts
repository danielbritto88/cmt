import { callClaude } from '../utils/anthropic';
import { logAgentUsage } from '../utils/logger';
import { AgentInput, AgentOutput } from '../types/index';
import { routeModel } from './guardian';
import { TASK_LIMITS } from '../config/limits';
import { CMT_CONFIG } from '../config/maestro';

// ─────────────────────────────────────────────
// CONTEXTOS INJETÁVEIS POR TIPO DE TAREFA
// ─────────────────────────────────────────────

const FRONTEND_CONTEXT = `Conhecimento de frontend:
- Stack: React 18 + TypeScript + MUI 5
- Componentes funcionais com hooks
- Evitar any — sempre tipar corretamente
- Nomes de componentes em PascalCase
- Arquivos de componente: ComponentName.tsx`;

const BACKEND_CONTEXT = `Conhecimento de backend:
- Stack: Spring Boot 3.2 + Java 17
- Padrão: Controller → Service → Repository
- ResponseEntity para respostas HTTP
- Validação com Bean Validation (@Valid, @NotNull)
- Nomes de classes em PascalCase, métodos em camelCase`;

const SAAS_CONTEXT = `Conhecimento de automação SaaS:
- Sempre validar autenticação antes de chamar APIs externas
- Tratar rate limits com retry exponencial
- Logar erros com contexto suficiente para debug
- Preferir operações idempotentes`;

function getContextForTask(taskType: string): string {
    switch (taskType) {
        case 'code': return `${FRONTEND_CONTEXT}\n\n${BACKEND_CONTEXT}`;
        case 'saas_automation': return SAAS_CONTEXT;
        default: return '';
    }
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT DO EXECUTOR
// ─────────────────────────────────────────────

function buildExecutorSystem(taskType: string): string {
    const extraContext = getContextForTask(taskType);

    return `Você é o Executor do CMT 1.0, um workflow multi-agent de IA.

Sua responsabilidade é gerar o resultado final da tarefa: código, texto, dados ou configuração.

Regras:
- Execute exatamente o que está especificado no plano ou na tarefa.
- Não tome decisões arquiteturais — siga o plano.
- Seja preciso e completo. Entregue o resultado pronto para uso.
- Não adicione explicações longas — o resultado deve falar por si.
- Se for código: entregue apenas o código, sem comentários desnecessários.
- Se for texto: entregue o texto final, sem meta-comentários.
${extraContext ? `\n${extraContext}` : ''}`;
}

// ─────────────────────────────────────────────
// MONTAGEM DA MENSAGEM DO EXECUTOR
// ─────────────────────────────────────────────

function buildExecutorMessage(input: AgentInput): string {
    const parts: string[] = [];

    if (input.briefing) {
        parts.push(`Tarefa: ${input.briefing.summary}`);
        parts.push(`Requisitos:\n${input.briefing.requirements.map(r => `- ${r}`).join('\n')}`);
    } else {
        parts.push(`Tarefa: ${input.task}`);
    }

    if (input.plan) {
        parts.push(`\nPlano técnico:`);
        parts.push(`Abordagem: ${input.plan.approach}`);
        parts.push(`Justificativa: ${input.plan.justification}`);
        parts.push(`Etapas:\n${input.plan.steps.map(s => `${s.step}. ${s.description}`).join('\n')}`);
    }

    if (input.previousOutput && input.testReport) {
        parts.push(`\nTentativa anterior (com falhas):\n${input.previousOutput}`);
        parts.push(`\nFalhas reportadas pelo Testador:`);
        input.testReport.failures.forEach(f => {
            parts.push(`- ${f.requirement}: ${f.location} → ${f.suggestion}`);
        });
        parts.push(`\nCorreção necessária: resolva as falhas acima mantendo o que está correto.`);
    }

    if (input.context) {
        parts.push(`\nContexto adicional:\n${input.context}`);
    }

    return parts.join('\n\n');
}

// ─────────────────────────────────────────────
// AGENTE EXECUTOR
// ─────────────────────────────────────────────

export async function runExecutor(input: AgentInput): Promise<AgentOutput> {
    if (CMT_CONFIG.verbose) {
        console.log('\n[Executor] Gerando resultado...');
    }

    const taskType = input.briefing?.taskType || 'unknown';
    const complexity = input.briefing?.complexity || 'medium';
    const model = routeModel(complexity, 'executor');
    const maxTokens = TASK_LIMITS[taskType]?.maxTokens || 25000;
    const systemPrompt = buildExecutorSystem(taskType);
    const userMessage = buildExecutorMessage(input);

    const result = await callClaude({
        tier: model,
        agentName: 'Executor',
        maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });

    logAgentUsage('executor', result.model, result.inputTokens, result.outputTokens, result.costUSD);

    if (CMT_CONFIG.verbose) {
        console.log(`[Executor] Resultado gerado (${result.inputTokens + result.outputTokens} tokens)`);
    }

    return {
        role: 'executor',
        result: result.content,
        tokensUsed: result.inputTokens + result.outputTokens,
        modelUsed: result.model,
        success: true,
    };
}