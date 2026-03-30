import { TestReport, TestFailure, Briefing } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO TESTADOR
// Funções auxiliares de validação
// ─────────────────────────────────────────────

// Valida se o resultado não está vazio ou inválido
export function skillCheckNotEmpty(result: string): TestFailure | null {
    if (!result || result.trim().length === 0) {
        return {
            requirement: 'Resultado não pode ser vazio',
            location: 'Output completo',
            suggestion: 'O Executor não gerou nenhum conteúdo. Tentar novamente.',
        };
    }
    return null;
}

// Verifica se o resultado tem tamanho mínimo razoável
export function skillCheckMinLength(result: string, minChars = 50): TestFailure | null {
    if (result.trim().length < minChars) {
        return {
            requirement: 'Resultado muito curto',
            location: 'Output completo',
            suggestion: `Resultado tem apenas ${result.trim().length} caracteres. Esperado pelo menos ${minChars}.`,
        };
    }
    return null;
}

// Verifica se palavras-chave dos requisitos aparecem no resultado
export function skillCheckKeywords(
    result: string,
    requirements: string[]
): TestFailure[] {
    const failures: TestFailure[] = [];
    const r = result.toLowerCase();

    requirements.forEach(req => {
        // Extrai palavras significativas do requisito (mais de 4 caracteres)
        const keywords = req.toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 3); // verifica até 3 palavras-chave por requisito

        const found = keywords.some(k => r.includes(k));

        if (!found && keywords.length > 0) {
            failures.push({
                requirement: req,
                location: 'Output completo',
                suggestion: `Nenhuma referência encontrada a: "${keywords.join('", "')}". Verificar se o requisito foi atendido.`,
            });
        }
    });

    return failures;
}

// Verifica se código TypeScript tem problemas óbvios
export function skillLintTypeScript(code: string): TestFailure[] {
    const failures: TestFailure[] = [];

    if (code.includes(': any') || code.includes('<any>')) {
        failures.push({
            requirement: 'Sem uso de any no TypeScript',
            location: 'Alguma tipagem no código',
            suggestion: 'Substituir "any" por um tipo específico ou "unknown".',
        });
    }

    if (code.includes('console.log') && !code.includes('// debug')) {
        failures.push({
            requirement: 'Sem console.log em código de produção',
            location: 'Algum console.log no código',
            suggestion: 'Remover console.log ou substituir por logger adequado.',
        });
    }

    if (code.includes('TODO') || code.includes('FIXME')) {
        failures.push({
            requirement: 'Sem pendências (TODO/FIXME) no código entregue',
            location: 'Comentário TODO ou FIXME encontrado',
            suggestion: 'Resolver os TODOs antes de entregar ou removê-los.',
        });
    }

    return failures;
}

// Executa todas as verificações e retorna relatório completo
export function skillRunAllChecks(
    result: string,
    briefing: Briefing
): TestReport {
    const failures: TestFailure[] = [];

    // Verificação 1: não vazio
    const emptyCheck = skillCheckNotEmpty(result);
    if (emptyCheck) failures.push(emptyCheck);

    // Verificação 2: tamanho mínimo
    const lengthCheck = skillCheckMinLength(result);
    if (lengthCheck) failures.push(lengthCheck);

    // Verificação 3: palavras-chave dos requisitos
    const keywordFailures = skillCheckKeywords(result, briefing.requirements);
    failures.push(...keywordFailures);

    // Verificação 4: lint TypeScript (apenas para tarefas de código)
    if (briefing.taskType === 'code') {
        const lintFailures = skillLintTypeScript(result);
        failures.push(...lintFailures);
    }

    if (failures.length === 0) {
        return {
            status: 'approved',
            summary: 'Todas as verificações passaram.',
            failures: [],
        };
    }

    return {
        status: 'failed',
        summary: `${failures.length} problema(s) encontrado(s).`,
        failures,
    };
}

// Formata o relatório para exibição no terminal
export function skillFormatTestReport(report: TestReport): string {
    if (report.status === 'approved') {
        return `✓ APROVADO — ${report.summary}`;
    }

    const lines: string[] = [`✗ FALHOU — ${report.summary}`];
    report.failures.forEach((f, i) => {
        lines.push(`  ${i + 1}. ${f.requirement}`);
        lines.push(`     Local: ${f.location}`);
        lines.push(`     Correção: ${f.suggestion}`);
    });

    return lines.join('\n');
}