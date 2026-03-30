import * as dotenv from 'dotenv';
dotenv.config();

import * as readline from 'readline';
import { runOrchestrator } from '../agents/orchestrator';
import { validateConfig } from '../config/maestro';
import { CMT_CONFIG } from '../config/maestro';

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

function printHeader(): void {
    console.log('\n' + '═'.repeat(50));
    console.log('  CMT 1.0 — Workflow Multi-Agent de IA');
    console.log('═'.repeat(50));
}

function printResult(result: string): void {
    console.log('\n' + '─'.repeat(50));
    console.log('[CMT] RESULTADO');
    console.log('─'.repeat(50));
    console.log(result);
    console.log('─'.repeat(50) + '\n');
}

function getTaskFromArgs(): string {
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    return args.join(' ').trim();
}

// ─────────────────────────────────────────────
// MODO DIRETO
// ─────────────────────────────────────────────

async function runDirect(task: string): Promise<void> {
    printHeader();
    console.log(`\n[CMT] Tarefa recebida: ${task}\n`);

    try {
        const output = await runOrchestrator(task);

        printResult(output.result);

        if (!output.success) {
            console.warn(`[CMT] ⚠️  Workflow encerrado com problemas: ${output.error}`);
            process.exit(1);
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n[CMT] ERRO: ${message}\n`);
        process.exit(1);
    }
}

// ─────────────────────────────────────────────
// MODO INTERATIVO
// ─────────────────────────────────────────────

async function runInteractive(): Promise<void> {
    printHeader();
    console.log('\n[CMT] Modo interativo iniciado.');
    console.log('[CMT] Digite sua tarefa e pressione Enter. Para sair, digite "sair".\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const ask = (prompt: string): Promise<string> =>
        new Promise(resolve => rl.question(prompt, resolve));

    while (true) {
        const task = (await ask('[CMT] Tarefa: ')).trim();

        if (!task) continue;

        if (task.toLowerCase() === 'sair' || task.toLowerCase() === 'exit') {
            console.log('\n[CMT] Encerrando. Até logo!\n');
            rl.close();
            break;
        }

        try {
            const output = await runOrchestrator(task);
            printResult(output.result);

            if (!output.success) {
                console.warn(`[CMT] ⚠️  Workflow encerrado com problemas: ${output.error}`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`\n[CMT] ERRO: ${message}`);
            console.log('[CMT] Tente novamente com uma tarefa diferente.\n');
        }
    }
}

// ─────────────────────────────────────────────
// ENTRADA PRINCIPAL
// ─────────────────────────────────────────────

async function main(): Promise<void> {
    validateConfig();

    if (CMT_CONFIG.interactive) {
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