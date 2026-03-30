"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAgentUsage = logAgentUsage;
exports.logCorrectionCycle = logCorrectionCycle;
exports.getTotalTokens = getTotalTokens;
exports.getTotalCost = getTotalCost;
exports.getSessionReport = getSessionReport;
exports.printSessionReport = printSessionReport;
exports.resetSession = resetSession;
const maestro_1 = require("../config/maestro");
// ─────────────────────────────────────────────
// ESTADO DA SESSÃO
// ─────────────────────────────────────────────
let sessionUsage = [];
let correctionCycles = 0;
// ─────────────────────────────────────────────
// REGISTRO DE USO POR AGENTE
// ─────────────────────────────────────────────
function logAgentUsage(agent, model, inputTokens, outputTokens, costUSD) {
    sessionUsage.push({ agent, model, inputTokens, outputTokens, estimatedCostUSD: costUSD });
    const total = getTotalTokens();
    if (total >= maestro_1.CMT_CONFIG.tokenAlertThreshold) {
        console.warn(`\n[CMT] ⚠️  ALERTA: sessão acumulou ${total.toLocaleString()} tokens (limite de alerta: ${maestro_1.CMT_CONFIG.tokenAlertThreshold.toLocaleString()})`);
    }
    if (maestro_1.CMT_CONFIG.tokenHardStop > 0 && total >= maestro_1.CMT_CONFIG.tokenHardStop) {
        console.error(`\n[CMT] 🛑 LIMITE ABSOLUTO ATINGIDO: ${total.toLocaleString()} tokens. Execução encerrada.`);
        process.exit(1);
    }
}
function logCorrectionCycle() {
    correctionCycles++;
}
// ─────────────────────────────────────────────
// TOTAIS
// ─────────────────────────────────────────────
function getTotalTokens() {
    return sessionUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0);
}
function getTotalCost() {
    return sessionUsage.reduce((sum, u) => sum + u.estimatedCostUSD, 0);
}
// ─────────────────────────────────────────────
// RELATÓRIO FINAL
// ─────────────────────────────────────────────
function getSessionReport() {
    return {
        totalInputTokens: sessionUsage.reduce((s, u) => s + u.inputTokens, 0),
        totalOutputTokens: sessionUsage.reduce((s, u) => s + u.outputTokens, 0),
        totalCostUSD: getTotalCost(),
        usageByAgent: sessionUsage,
        correctionCycles,
    };
}
function printSessionReport() {
    if (!maestro_1.CMT_CONFIG.showCost)
        return;
    const report = getSessionReport();
    console.log('\n' + '─'.repeat(50));
    console.log('[CMT] RELATÓRIO DE CUSTO DA SESSÃO');
    console.log('─'.repeat(50));
    report.usageByAgent.forEach(u => {
        const total = u.inputTokens + u.outputTokens;
        console.log(`  ${u.agent.padEnd(14)} │ ${String(total).padStart(7)} tokens │ US$ ${u.estimatedCostUSD.toFixed(4)}`);
    });
    console.log('─'.repeat(50));
    console.log(`  ${'TOTAL'.padEnd(14)} │ ${String(report.totalInputTokens + report.totalOutputTokens).padStart(7)} tokens │ US$ ${report.totalCostUSD.toFixed(4)}`);
    if (report.correctionCycles > 0) {
        console.log(`  Ciclos de correção: ${report.correctionCycles}`);
    }
    console.log('─'.repeat(50) + '\n');
}
// ─────────────────────────────────────────────
// RESET (para testes)
// ─────────────────────────────────────────────
function resetSession() {
    sessionUsage = [];
    correctionCycles = 0;
}
