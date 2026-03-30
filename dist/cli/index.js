#!/usr/bin/env node
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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const readline = __importStar(require("readline"));
const orchestrator_1 = require("../agents/orchestrator");
const maestro_1 = require("../config/maestro");
const maestro_2 = require("../config/maestro");
// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────
function printHeader() {
    console.log('\n' + '═'.repeat(50));
    console.log('  CMT 1.0 — Workflow Multi-Agent de IA');
    console.log('═'.repeat(50));
}
function printResult(result) {
    console.log('\n' + '─'.repeat(50));
    console.log('[CMT] RESULTADO');
    console.log('─'.repeat(50));
    console.log(result);
    console.log('─'.repeat(50) + '\n');
}
function getTaskFromArgs() {
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    return args.join(' ').trim();
}
// ─────────────────────────────────────────────
// MODO DIRETO
// ─────────────────────────────────────────────
async function runDirect(task) {
    printHeader();
    console.log(`\n[CMT] Tarefa recebida: ${task}\n`);
    try {
        const output = await (0, orchestrator_1.runOrchestrator)(task);
        printResult(output.result);
        if (!output.success) {
            console.warn(`[CMT] ⚠️  Workflow encerrado com problemas: ${output.error}`);
            process.exit(1);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n[CMT] ERRO: ${message}\n`);
        process.exit(1);
    }
}
// ─────────────────────────────────────────────
// MODO INTERATIVO
// ─────────────────────────────────────────────
async function runInteractive() {
    printHeader();
    console.log('\n[CMT] Modo interativo iniciado.');
    console.log('[CMT] Digite sua tarefa e pressione Enter. Para sair, digite "sair".\n');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const ask = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    while (true) {
        const task = (await ask('[CMT] Tarefa: ')).trim();
        if (!task)
            continue;
        if (task.toLowerCase() === 'sair' || task.toLowerCase() === 'exit') {
            console.log('\n[CMT] Encerrando. Até logo!\n');
            rl.close();
            break;
        }
        try {
            const output = await (0, orchestrator_1.runOrchestrator)(task);
            printResult(output.result);
            if (!output.success) {
                console.warn(`[CMT] ⚠️  Workflow encerrado com problemas: ${output.error}`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`\n[CMT] ERRO: ${message}`);
            console.log('[CMT] Tente novamente com uma tarefa diferente.\n');
        }
    }
}
// ─────────────────────────────────────────────
// ENTRADA PRINCIPAL
// ─────────────────────────────────────────────
async function main() {
    (0, maestro_1.validateConfig)();
    if (maestro_2.CMT_CONFIG.interactive) {
        await runInteractive();
        return;
    }
    const task = getTaskFromArgs();
    if (!task) {
        console.log('\n[CMT] Uso:');
        console.log('  npm run cmt -- "descreva sua tarefa"');
        console.log('  npm run cmt -- "descreva sua tarefa" --verbose');
        console.log('  npm run cmt -- "descreva sua tarefa" --cost');
        console.log('  npm run cmt -- --interactive\n');
        process.exit(0);
    }
    await runDirect(task);
}
main();
