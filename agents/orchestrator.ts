import { runAnalyst } from './analyst';
import { runThinker } from './thinker';
import { runExecutor } from './executor';
import { runTester } from './tester';
import { runCorrector } from './corrector';
import { compressContext, checkSessionLimit } from './guardian';
import { logCorrectionCycle, printSessionReport } from '../utils/logger';
import { AgentInput, Briefing, Plan, TestReport } from '../types/index';
import { MAX_CORRECTION_CYCLES } from '../config/limits';
import { CMT_CONFIG } from '../config/maestro';
import { addToMemory } from '../utils/session-memory';

// ─────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────

export interface OrchestratorResult {
    success: boolean;
    result: string;
    briefing: Briefing;
    plan?: Plan;
    correctionCycles: number;
    error?: string;
}

// ─────────────────────────────────────────────
// ORQUESTRADOR PRINCIPAL
// ─────────────────────────────────────────────

export async function runOrchestrator(
    task: string,
    context?: string
): Promise<OrchestratorResult> {

    console.log('\n[CMT] Iniciando workflow...');

    let correctionCycles = 0;
    let currentOutput = '';
    let lastTestReport: TestReport | undefined;

    // ── Etapa 1: Analista ──────────────────────
    checkSessionLimit();

    const analystInput: AgentInput = { task, context };
    const briefing = await runAnalyst(analystInput);

    if (CMT_CONFIG.verbose) {
        console.log('\n[Orquestrador] Briefing recebido:');
        console.log(`  Tipo: ${briefing.taskType}`);
        console.log(`  Complexidade: ${briefing.complexity}`);
        console.log(`  Pensador necessário: ${briefing.needsThinker}`);
    }

    // ── Etapa 2: Pensador (se necessário) ──────
    let plan: Plan | undefined;

    if (briefing.needsThinker) {
        checkSessionLimit();

        const thinkerInput: AgentInput = { task, context, briefing };
        plan = await runThinker(thinkerInput);

        if (CMT_CONFIG.verbose) {
            console.log(`\n[Orquestrador] Plano recebido: ${plan.approach}`);
        }
    } else {
        if (CMT_CONFIG.verbose) {
            console.log('\n[Orquestrador] Complexidade baixa/média — Pensador não necessário.');
        }
    }

    // ── Etapa 3: Compressão de contexto ────────
    let compressedContext = context;
    if (context && context.length > 3000) {
        compressedContext = await compressContext(context);
    }

    // ── Etapa 4: Ciclo Executor → Testador ─────
    while (correctionCycles <= MAX_CORRECTION_CYCLES) {
        checkSessionLimit();

        // Executor
        const executorInput: AgentInput = {
            task,
            context: compressedContext,
            briefing,
            plan,
            previousOutput: lastTestReport ? currentOutput : undefined,
            testReport: lastTestReport,
        };

        const executorOutput = await runExecutor(executorInput);
        currentOutput = executorOutput.result;

        // Testador
        checkSessionLimit();

        const testerInput: AgentInput = {
            task,
            briefing,
            previousOutput: currentOutput,
        };

        const testReport = await runTester(testerInput);

        // Aprovado — sai do ciclo
        if (testReport.status === 'approved') {
            console.log('\n[CMT] ✓ Resultado aprovado pelo Testador.');
            addToMemory({
                timestamp: new Date().toISOString(),
                task,
                briefing,
                plan,
                result: currentOutput,
                approved: true,
                cycles: correctionCycles,
            });
            printSessionReport();
            return {
                success: true,
                result: currentOutput,
                briefing,
                plan,
                correctionCycles,
            };
        }

        // Falhou — verifica limite de ciclos
        correctionCycles++;
        logCorrectionCycle();

        if (correctionCycles > MAX_CORRECTION_CYCLES) {
            console.warn(`\n[Orquestrador] ⚠️  Limite de ${MAX_CORRECTION_CYCLES} ciclos de correção atingido.`);
            console.warn('[Orquestrador] Escalando para o Pensador antes de nova tentativa...');

            // Escala para o Pensador com contexto do problema
            const escalationInput: AgentInput = {
                task: `${task}\n\nATENÇÃO: Após ${MAX_CORRECTION_CYCLES} tentativas, os seguintes problemas persistem:\n` +
                    testReport.failures.map(f => `- ${f.requirement}: ${f.suggestion}`).join('\n'),
                context: compressedContext,
                briefing: { ...briefing, complexity: 'high' },
            };

            plan = await runThinker(escalationInput);
            correctionCycles = 0;
            lastTestReport = undefined;
            continue;
        }

        // Corretor
        checkSessionLimit();

        const correctorInput: AgentInput = {
            task,
            briefing,
            previousOutput: currentOutput,
            testReport,
        };

        const correctorOutput = await runCorrector(correctorInput);
        currentOutput = correctorOutput.result;
        lastTestReport = testReport;

        console.log(`\n[Orquestrador] Ciclo de correção ${correctionCycles}/${MAX_CORRECTION_CYCLES} concluído.`);
    }

    // Nunca deve chegar aqui, mas por segurança:
    printSessionReport();
    return {
        success: false,
        result: currentOutput,
        briefing,
        plan,
        correctionCycles,
        error: 'Número máximo de ciclos de correção atingido.',
    };
}