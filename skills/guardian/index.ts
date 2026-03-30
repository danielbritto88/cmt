import { estimateTokens, compressContext, routeModel, guardianCheck } from '../../agents/guardian';
import { ModelTier, ComplexityLevel } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO GUARDIÃO
// Funções exportadas para uso pelo Orquestrador
// ─────────────────────────────────────────────

export function skillCountTokens(text: string): number {
    return estimateTokens(text);
}

export async function skillCompressContext(context: string): Promise<string> {
    return compressContext(context);
}

export function skillRouteModel(complexity: ComplexityLevel, agentRole: string): ModelTier {
    return routeModel(complexity, agentRole);
}

export function skillGuardianCheck(
    agentRole: string,
    complexity: ComplexityLevel,
    contextSize: number
) {
    return guardianCheck(agentRole, complexity, contextSize);
}