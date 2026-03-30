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
exports.addToMemory = addToMemory;
exports.getSessionSummary = getSessionSummary;
exports.clearMemory = clearMemory;
exports.getSessionCount = getSessionCount;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─────────────────────────────────────────────
// MEMÓRIA DE SESSÃO
// Acumula o que foi feito na sessão atual.
// Permite tarefas encadeadas — o Analista
// consulta este histórico antes de analisar
// uma nova tarefa.
// ─────────────────────────────────────────────
const MEMORY_PATH = path.join(process.cwd(), '.cmt-session.json');
// ─────────────────────────────────────────────
// LEITURA E ESCRITA
// ─────────────────────────────────────────────
function loadMemory() {
    try {
        if (fs.existsSync(MEMORY_PATH)) {
            const raw = fs.readFileSync(MEMORY_PATH, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch {
        // falha silenciosa
    }
    return { startedAt: new Date().toISOString(), entries: [] };
}
function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf-8');
    }
    catch {
        // falha silenciosa
    }
}
// ─────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────
// Adiciona uma tarefa concluída à memória
function addToMemory(entry) {
    const memory = loadMemory();
    memory.entries.push(entry);
    saveMemory(memory);
}
// Retorna um resumo da sessão para o Analista usar
function getSessionSummary() {
    const memory = loadMemory();
    if (memory.entries.length === 0)
        return '';
    const lines = [
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
function clearMemory() {
    try {
        if (fs.existsSync(MEMORY_PATH)) {
            fs.unlinkSync(MEMORY_PATH);
        }
    }
    catch {
        // falha silenciosa
    }
}
// Retorna quantas tarefas foram executadas na sessão
function getSessionCount() {
    return loadMemory().entries.length;
}
