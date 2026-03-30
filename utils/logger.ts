import { SessionReport, TokenUsage, AgentRole } from '../types/index';
import { CMT_CONFIG } from '../config/maestro';

// ─────────────────────────────────────────────
// ESTADO DA SESSÃO
// ─────────────────────────────────────────────

let sessionUsage: TokenUsage[] = [];
let correctionCycles = 0;

// ─────────────────────────────────────────────
// REGISTRO DE USO POR AGENTE
// ─────────────────────────────────────────────

export function logAgentUsage(
    agent: AgentRole,
    model: string,
    inputTokens: number,
    outputTokens: number,
    costUSD: number
): void {
    sessionUsage.push({ agent, model, inputTokens, outputTokens, estimatedCostUSD: costUSD });

    const total = getTotalTokens();

    if (total >= CMT_CONFIG.tokenAlertThreshold) {
        console.warn(`\n[CMT] ⚠️  ALERTA: sessão acumulou ${total.toLocaleString()} tokens (limite de alerta: ${CMT_CONFIG.tokenAlertThreshold.toLocaleString()})`);
    }

    if (CMT_CONFIG.tokenHardStop > 0 && total >= CMT_CONFIG.tokenHardStop) {
        console.error(`\n[CMT] 🛑 LIMITE ABSOLUTO ATINGIDO: ${total.toLocaleString()} tokens. Execução encerrada.`);
        process.exit(1);
    }
}

export function logCorrectionCycle(): void {
    correctionCycles++;
}

// ─────────────────────────────────────────────
// TOTAIS
// ─────────────────────────────────────────────

export function getTotalTokens(): number {
    return sessionUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0);
}

export function getTotalCost(): number {
    return sessionUsage.reduce((sum, u) => sum + u.estimatedCostUSD, 0);
}

// ─────────────────────────────────────────────
// RELATÓRIO FINAL
// ─────────────────────────────────────────────

export function getSessionReport(): SessionReport {
    return {
        totalInputTokens: sessionUsage.reduce((s, u) => s + u.inputTokens, 0),
        totalOutputTokens: sessionUsage.reduce((s, u) => s + u.outputTokens, 0),
        totalCostUSD: getTotalCost(),
        usageByAgent: sessionUsage,
        correctionCycles,
    };
}

export function printSessionReport(): void {
    if (!CMT_CONFIG.showCost) return;

    const report = getSessionReport();

    console.log('\n' + '─'.repeat(50));
    console.log('[CMT] RELATÓRIO DE CUSTO DA SESSÃO');
    console.log('─'.repeat(50));

    report.usageByAgent.forEach(u => {
        const total = u.inputTokens + u.outputTokens;
        console.log(
            `  ${u.agent.padEnd(14)} │ ${String(total).padStart(7)} tokens │ US$ ${u.estimatedCostUSD.toFixed(4)}`
        );
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

export function resetSession(): void {
    sessionUsage = [];
    correctionCycles = 0;
}