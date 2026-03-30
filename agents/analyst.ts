import * as fs from 'fs';
import * as path from 'path';
import { callClaude } from '../utils/anthropic';
import { logAgentUsage } from '../utils/logger';
import { AgentInput, Briefing, TaskType, ComplexityLevel } from '../types/index';
import { routeModel, estimateTokens } from './guardian';
import { CMT_CONFIG } from '../config/maestro';
import { getSessionSummary } from '../utils/session-memory';

// ─────────────────────────────────────────────
// CONTEXTO DE PROJETO
// ─────────────────────────────────────────────

const PROJECT_CONTEXT_PATH = path.join(process.cwd(), 'project-context.md');

function loadProjectContext(): string {
    try {
        if (fs.existsSync(PROJECT_CONTEXT_PATH)) {
            return fs.readFileSync(PROJECT_CONTEXT_PATH, 'utf-8');
        }
    } catch {
        // falha silenciosa — contexto de projeto é opcional
    }
    return '';
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT DO ANALISTA
// ─────────────────────────────────────────────

const ANALYST_SYSTEM = `Você é o Analista do CMT 1.0, um workflow multi-agent de IA.

Sua única responsabilidade é interpretar a tarefa do usuário e produzir um briefing técnico estruturado.

Regras:
- O usuário pode descrever a tarefa em linguagem comum, de forma vaga ou imprecisa. Você interpreta e estrutura.
- Nunca execute a tarefa — apenas a analise e estruture.
- Seja direto e conciso. Sem introduções ou conclusões desnecessárias.
- Responda APENAS com um objeto JSON válido, sem markdown, sem blocos de código, sem texto antes ou depois.

O JSON deve ter exatamente esta estrutura:
{
  "taskType": "code" | "content" | "analysis" | "saas_automation" | "unknown",
  "summary": "resumo claro da tarefa em 1-2 frases",
  "requirements": ["requisito 1", "requisito 2"],
  "risks": ["risco 1", "risco 2"],
  "estimatedTokens": número inteiro,
  "complexity": "low" | "medium" | "high",
  "needsThinker": true | false
}

Critérios de complexidade:
- low: tarefa clara, direta, sem decisões arquiteturais
- medium: tarefa com múltiplos requisitos ou alguma ambiguidade
- high: tarefa com decisões de design, múltiplos sistemas ou alta ambiguidade

needsThinker = true apenas quando complexity = "high"`;

// ─────────────────────────────────────────────
// PARSING DO BRIEFING
// ─────────────────────────────────────────────

function parseBriefing(raw: string): Briefing {
    try {
        const parsed = JSON.parse(raw.trim());

        const validTaskTypes: TaskType[] = ['code', 'content', 'analysis', 'saas_automation', 'unknown'];
        const validComplexity: ComplexityLevel[] = ['low', 'medium', 'high'];

        return {
            taskType: validTaskTypes.includes(parsed.taskType) ? parsed.taskType : 'unknown',
            summary: typeof parsed.summary === 'string' ? parsed.summary : 'Tarefa não identificada',
            requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks : [],
            estimatedTokens: typeof parsed.estimatedTokens === 'number' ? parsed.estimatedTokens : 5000,
            complexity: validComplexity.includes(parsed.complexity) ? parsed.complexity : 'medium',
            needsThinker: typeof parsed.needsThinker === 'boolean' ? parsed.needsThinker : false,
        };
    } catch {
        return {
            taskType: 'unknown',
            summary: raw.slice(0, 200),
            requirements: ['Tarefa a ser executada conforme descrição original'],
            risks: ['Descrição ambígua — resultado pode não corresponder ao esperado'],
            estimatedTokens: 10000,
            complexity: 'medium',
            needsThinker: false,
        };
    }
}

// ─────────────────────────────────────────────
// AGENTE ANALISTA
// ─────────────────────────────────────────────

export async function runAnalyst(input: AgentInput): Promise<Briefing> {
    if (CMT_CONFIG.verbose) {
        console.log('\n[Analista] Interpretando tarefa...');
    }

    const projectContext = loadProjectContext();
    const sessionSummary = getSessionSummary();
    const contextParts: string[] = [];

    if (projectContext) {
        contextParts.push(`Contexto do projeto:\n${projectContext}`);
    }

    if (sessionSummary) {
        contextParts.push(`Histórico da sessão atual:\n${sessionSummary}`);
    }

    if (input.context) {
        contextParts.push(`Contexto adicional:\n${input.context}`);
    }

    const fullContext = contextParts.join('\n\n');
    const model = routeModel('low', 'analyst');

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
        {
            role: 'user',
            content: fullContext
                ? `${fullContext}\n\nTarefa:\n${input.task}`
                : input.task,
        }
    ];

    const result = await callClaude({
        tier: model,
        agentName: 'Analista',
        maxTokens: 1000,
        system: ANALYST_SYSTEM,
        messages,
    });

    logAgentUsage('analyst', result.model, result.inputTokens, result.outputTokens, result.costUSD);

    const briefing = parseBriefing(result.content);

    if (CMT_CONFIG.verbose) {
        console.log(`[Analista] Tipo: ${briefing.taskType} | Complexidade: ${briefing.complexity} | Pensador: ${briefing.needsThinker}`);
        console.log(`[Analista] Resumo: ${briefing.summary}`);
        if (projectContext) {
            console.log(`[Analista] Contexto de projeto carregado.`);
        }
    }

    return briefing;
}