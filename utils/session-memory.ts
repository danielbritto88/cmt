import * as fs from 'fs';
import * as path from 'path';
import { Briefing, Plan, TestReport } from '../types/index';

// ─────────────────────────────────────────────
// MEMÓRIA DE SESSÃO
// Acumula o que foi feito na sessão atual.
// Permite tarefas encadeadas — o Analista
// consulta este histórico antes de analisar
// uma nova tarefa.
// ─────────────────────────────────────────────

const MEMORY_PATH = path.join(process.cwd(), '.cmt-session.json');

export interface SessionEntry {
    timestamp: string;
    task: string;
    briefing: Briefing;
    plan?: Plan;
    result: string;
    approved: boolean;
    cycles: number;
}

export interface SessionMemory {
    startedAt: string;
    entries: SessionEntry[];
}

// ─────────────────────────────────────────────
// LEITURA E ESCRITA
// ─────────────────────────────────────────────

function loadMemory(): SessionMemory {
    try {
        if (fs.existsSync(MEMORY_PATH)) {
            const raw = fs.readFileSync(MEMORY_PATH, 'utf-8');
            return JSON.parse(raw);
        }
    } catch {
        // falha silenciosa
    }
    return { startedAt: new Date().toISOString(), entries: [] };
}

function saveMemory(memory: SessionMemory): void {
    try {
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf-8');
    } catch {
        // falha silenciosa
    }
}

// ─────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────

// Adiciona uma tarefa concluída à memória
export function addToMemory(entry: SessionEntry): void {
    const memory = loadMemory();
    memory.entries.push(entry);
    saveMemory(memory);
}

// Retorna um resumo da sessão para o Analista usar
export function getSessionSummary(): string {
    const memory = loadMemory();

    if (memory.entries.length === 0) return '';

    const lines: string[] = [
        `Tarefas já executadas nesta sessão (${memory.entries.length}):`,
    ];

    memory.entries.slice(-5).forEach((e, i) => {
        // Mostra apenas as últimas 5 para não inflar o contexto
        lines.push(`\n${i + 1}. ${e.briefing.summary}`);
        lines.push(`   Tipo: ${e.briefing.taskType} | Status: ${e.approved ? 'aprovado' : 'com problemas'}`);
        if (e.plan) {
            lines.push(`   Abordagem usada: ${e.plan.approach}`);
        }
    });

    return lines.join('\n');
}

// Limpa a memória da sessão
export function clearMemory(): void {
    try {
        if (fs.existsSync(MEMORY_PATH)) {
            fs.unlinkSync(MEMORY_PATH);
        }
    } catch {
        // falha silenciosa
    }
}

// Retorna quantas tarefas foram executadas na sessão
export function getSessionCount(): number {
    return loadMemory().entries.length;
}