"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalyst = runAnalyst;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const anthropic_1 = require("../utils/anthropic");
const logger_1 = require("../utils/logger");
const guardian_1 = require("./guardian");
const maestro_1 = require("../config/maestro");
const session_memory_1 = require("../utils/session-memory");
// ─────────────────────────────────────────────
// CONTEXTO DE PROJETO
// ─────────────────────────────────────────────
const PROJECT_CONTEXT_PATH = path.join(process.cwd(), 'project-context.md');
function loadProjectContext() {
    try {
        if (fs.existsSync(PROJECT_CONTEXT_PATH)) {
            return fs.readFileSync(PROJECT_CONTEXT_PATH, 'utf-8');
        }
    }
    catch {
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
function parseBriefing(raw) {
    try {
        const parsed = JSON.parse(raw.trim());
        const validTaskTypes = ['code', 'content', 'analysis', 'saas_automation', 'unknown'];
        const validComplexity = ['low', 'medium', 'high'];
        return {
            taskType: validTaskTypes.includes(parsed.taskType) ? parsed.taskType : 'unknown',
            summary: typeof parsed.summary === 'string' ? parsed.summary : 'Tarefa não identificada',
            requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks : [],
            estimatedTokens: typeof parsed.estimatedTokens === 'number' ? parsed.estimatedTokens : 5000,
            complexity: validComplexity.includes(parsed.complexity) ? parsed.complexity : 'medium',
            needsThinker: typeof parsed.needsThinker === 'boolean' ? parsed.needsThinker : false,
        };
    }
    catch {
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
async function runAnalyst(input) {
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log('\n[Analista] Interpretando tarefa...');
    }
    const projectContext = loadProjectContext();
    const sessionSummary = (0, session_memory_1.getSessionSummary)();
    const contextParts = [];
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
    const model = (0, guardian_1.routeModel)('low', 'analyst');
    const messages = [
        {
            role: 'user',
            content: fullContext
                ? `${fullContext}\n\nTarefa:\n${input.task}`
                : input.task,
        }
    ];
    const result = await (0, anthropic_1.callClaude)({
        tier: model,
        agentName: 'Analista',
        maxTokens: 1000,
        system: ANALYST_SYSTEM,
        messages,
    });
    (0, logger_1.logAgentUsage)('analyst', result.model, result.inputTokens, result.outputTokens, result.costUSD);
    const briefing = parseBriefing(result.content);
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log(`[Analista] Tipo: ${briefing.taskType} | Complexidade: ${briefing.complexity} | Pensador: ${briefing.needsThinker}`);
        console.log(`[Analista] Resumo: ${briefing.summary}`);
        if (projectContext) {
            console.log(`[Analista] Contexto de projeto carregado.`);
        }
    }
    return briefing;
}
