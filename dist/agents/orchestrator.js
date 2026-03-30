"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOrchestrator = runOrchestrator;
const analyst_1 = require("./analyst");
const thinker_1 = require("./thinker");
const executor_1 = require("./executor");
const tester_1 = require("./tester");
const corrector_1 = require("./corrector");
const guardian_1 = require("./guardian");
const logger_1 = require("../utils/logger");
const limits_1 = require("../config/limits");
const maestro_1 = require("../config/maestro");
const session_memory_1 = require("../utils/session-memory");
// ─────────────────────────────────────────────
// ORQUESTRADOR PRINCIPAL
// ─────────────────────────────────────────────
async function runOrchestrator(task, context) {
    console.log('\n[CMT] Iniciando workflow...');
    let correctionCycles = 0;
    let currentOutput = '';
    let lastTestReport;
    // ── Etapa 1: Analista ──────────────────────
    (0, guardian_1.checkSessionLimit)();
    const analystInput = { task, context };
    const briefing = await (0, analyst_1.runAnalyst)(analystInput);
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log('\n[Orquestrador] Briefing recebido:');
        console.log(`  Tipo: ${briefing.taskType}`);
        console.log(`  Complexidade: ${briefing.complexity}`);
        console.log(`  Pensador necessário: ${briefing.needsThinker}`);
    }
    // ── Etapa 2: Pensador (se necessário) ──────
    let plan;
    if (briefing.needsThinker) {
        (0, guardian_1.checkSessionLimit)();
        const thinkerInput = { task, context, briefing };
        plan = await (0, thinker_1.runThinker)(thinkerInput);
        if (maestro_1.CMT_CONFIG.verbose) {
            console.log(`\n[Orquestrador] Plano recebido: ${plan.approach}`);
        }
    }
    else {
        if (maestro_1.CMT_CONFIG.verbose) {
            console.log('\n[Orquestrador] Complexidade baixa/média — Pensador não necessário.');
        }
    }
    // ── Etapa 3: Compressão de contexto ────────
    let compressedContext = context;
    if (context && context.length > 3000) {
        compressedContext = await (0, guardian_1.compressContext)(context);
    }
    // ── Etapa 4: Ciclo Executor → Testador ─────
    while (correctionCycles <= limits_1.MAX_CORRECTION_CYCLES) {
        (0, guardian_1.checkSessionLimit)();
        // Executor
        const executorInput = {
            task,
            context: compressedContext,
            briefing,
            plan,
            previousOutput: lastTestReport ? currentOutput : undefined,
            testReport: lastTestReport,
        };
        const executorOutput = await (0, executor_1.runExecutor)(executorInput);
        currentOutput = executorOutput.result;
        // Testador
        (0, guardian_1.checkSessionLimit)();
        const testerInput = {
            task,
            briefing,
            previousOutput: currentOutput,
        };
        const testReport = await (0, tester_1.runTester)(testerInput);
        // Aprovado — sai do ciclo
        if (testReport.status === 'approved') {
            console.log('\n[CMT] ✓ Resultado aprovado pelo Testador.');
            (0, session_memory_1.addToMemory)({
                timestamp: new Date().toISOString(),
                task,
                briefing,
                plan,
                result: currentOutput,
                approved: true,
                cycles: correctionCycles,
            });
            (0, logger_1.printSessionReport)();
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
        (0, logger_1.logCorrectionCycle)();
        if (correctionCycles > limits_1.MAX_CORRECTION_CYCLES) {
            console.warn(`\n[Orquestrador] ⚠️  Limite de ${limits_1.MAX_CORRECTION_CYCLES} ciclos de correção atingido.`);
            console.warn('[Orquestrador] Escalando para o Pensador antes de nova tentativa...');
            // Escala para o Pensador com contexto do problema
            const escalationInput = {
                task: `${task}\n\nATENÇÃO: Após ${limits_1.MAX_CORRECTION_CYCLES} tentativas, os seguintes problemas persistem:\n` +
                    testReport.failures.map(f => `- ${f.requirement}: ${f.suggestion}`).join('\n'),
                context: compressedContext,
                briefing: { ...briefing, complexity: 'high' },
            };
            plan = await (0, thinker_1.runThinker)(escalationInput);
            correctionCycles = 0;
            lastTestReport = undefined;
            continue;
        }
        // Corretor
        (0, guardian_1.checkSessionLimit)();
        const correctorInput = {
            task,
            briefing,
            previousOutput: currentOutput,
            testReport,
        };
        const correctorOutput = await (0, corrector_1.runCorrector)(correctorInput);
        currentOutput = correctorOutput.result;
        lastTestReport = testReport;
        console.log(`\n[Orquestrador] Ciclo de correção ${correctionCycles}/${limits_1.MAX_CORRECTION_CYCLES} concluído.`);
    }
    // Nunca deve chegar aqui, mas por segurança:
    (0, logger_1.printSessionReport)();
    return {
        success: false,
        result: currentOutput,
        briefing,
        plan,
        correctionCycles,
        error: 'Número máximo de ciclos de correção atingido.',
    };
}
