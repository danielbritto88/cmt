import { TestReport, TestFailure } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO CORRETOR
// Funções auxiliares de correção cirúrgica
// ─────────────────────────────────────────────

// Isola as falhas mais críticas para corrigir primeiro
export function skillPrioritizeFailures(failures: TestFailure[]): TestFailure[] {
    const priority: Record<string, number> = {
        'Resultado não pode ser vazio': 100,
        'Resultado muito curto': 90,
        'Sem uso de any no TypeScript': 50,
        'Sem pendências (TODO/FIXME) no código': 40,
        'Sem console.log em código de produção': 30,
    };

    return [...failures].sort((a, b) => {
        const scoreA = priority[a.requirement] ?? 10;
        const scoreB = priority[b.requirement] ?? 10;
        return scoreB - scoreA;
    });
}

// Gera instruções de correção a partir do relatório do Testador
export function skillBuildCorrectionInstructions(report: TestReport): string {
    if (report.failures.length === 0) return '';

    const prioritized = skillPrioritizeFailures(report.failures);
    const lines: string[] = ['Corrija os seguintes problemas:'];

    prioritized.forEach((f, i) => {
        lines.push(`\n${i + 1}. Problema: ${f.requirement}`);
        lines.push(`   Onde: ${f.location}`);
        lines.push(`   Como corrigir: ${f.suggestion}`);
    });

    lines.push('\nRegras obrigatórias:');
    lines.push('- Corrija APENAS os problemas listados acima');
    lines.push('- Não altere o que está funcionando');
    lines.push('- Entregue o resultado completo, não apenas o trecho corrigido');

    return lines.join('\n');
}

// Verifica se a correção realmente resolveu os problemas reportados
export function skillVerifyCorrection(
    original: string,
    corrected: string,
    failures: TestFailure[]
): { resolved: TestFailure[]; unresolved: TestFailure[] } {
    const resolved: TestFailure[] = [];
    const unresolved: TestFailure[] = [];

    failures.forEach(failure => {
        // Verifica se o problema de 'any' foi resolvido
        if (failure.requirement.includes('any')) {
            if (!corrected.includes(': any') && !corrected.includes('<any>')) {
                resolved.push(failure);
            } else {
                unresolved.push(failure);
            }
            return;
        }

        // Verifica se console.log foi removido
        if (failure.requirement.includes('console.log')) {
            if (!corrected.includes('console.log')) {
                resolved.push(failure);
            } else {
                unresolved.push(failure);
            }
            return;
        }

        // Verifica se TODO/FIXME foi removido
        if (failure.requirement.includes('TODO')) {
            if (!corrected.includes('TODO') && !corrected.includes('FIXME')) {
                resolved.push(failure);
            } else {
                unresolved.push(failure);
            }
            return;
        }

        // Para outros casos: verifica se o resultado mudou
        if (corrected !== original && corrected.trim().length > 0) {
            resolved.push(failure);
        } else {
            unresolved.push(failure);
        }
    });

    return { resolved, unresolved };
}

// Gera resumo do que foi corrigido
export function skillSummarizeCorrection(
    resolved: TestFailure[],
    unresolved: TestFailure[]
): string {
    const lines: string[] = [];

    if (resolved.length > 0) {
        lines.push(`Corrigido (${resolved.length}):`);
        resolved.forEach(f => lines.push(`  ✓ ${f.requirement}`));
    }

    if (unresolved.length > 0) {
        lines.push(`Não resolvido (${unresolved.length}):`);
        unresolved.forEach(f => lines.push(`  ✗ ${f.requirement}`));
    }

    return lines.join('\n');
}