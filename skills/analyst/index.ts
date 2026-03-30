import { Briefing, TaskType, ComplexityLevel } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO ANALISTA
// Funções auxiliares de análise e classificação
// ─────────────────────────────────────────────

// Detecta o tipo de tarefa por palavras-chave
export function skillDetectTaskType(task: string): TaskType {
    const t = task.toLowerCase();

    const codeKeywords = ['código', 'code', 'implementar', 'implement', 'função', 'function',
        'componente', 'component', 'endpoint', 'api', 'classe', 'class',
        'refatorar', 'refactor', 'bug', 'erro', 'error', 'corrigir', 'fix'];

    const contentKeywords = ['escrever', 'write', 'texto', 'text', 'artigo', 'article',
        'documentação', 'documentation', 'readme', 'descrição', 'description',
        'email', 'mensagem', 'message', 'post', 'conteúdo', 'content'];

    const analysisKeywords = ['analisar', 'analyze', 'análise', 'analysis', 'avaliar', 'evaluate',
        'revisar', 'review', 'verificar', 'verify', 'checar', 'check',
        'comparar', 'compare', 'explicar', 'explain', 'entender', 'understand'];

    const saasKeywords = ['integrar', 'integrate', 'integração', 'integration', 'webhook',
        'automação', 'automation', 'automatizar', 'automate', 'saas',
        'sincronizar', 'sync', 'pipeline', 'workflow', 'fluxo'];

    const scores: Record<TaskType, number> = {
        code: codeKeywords.filter(k => t.includes(k)).length,
        content: contentKeywords.filter(k => t.includes(k)).length,
        analysis: analysisKeywords.filter(k => t.includes(k)).length,
        saas_automation: saasKeywords.filter(k => t.includes(k)).length,
        unknown: 0,
    };

    const best = (Object.entries(scores) as [TaskType, number][])
        .filter(([type]) => type !== 'unknown')
        .sort(([, a], [, b]) => b - a)[0];

    return best[1] > 0 ? best[0] : 'unknown';
}

// Estima complexidade por tamanho e palavras-chave
export function skillEstimateComplexity(task: string, requirements: string[]): ComplexityLevel {
    const t = task.toLowerCase();

    const highKeywords = ['arquitetura', 'architecture', 'refatoração', 'refactoring',
        'migração', 'migration', 'sistema', 'system', 'múltiplos', 'multiple',
        'integração', 'integration', 'segurança', 'security', 'performance'];

    const lowKeywords = ['simples', 'simple', 'pequeno', 'small', 'rápido', 'quick',
        'apenas', 'only', 'somente', 'just', 'um único', 'single'];

    const highScore = highKeywords.filter(k => t.includes(k)).length;
    const lowScore = lowKeywords.filter(k => t.includes(k)).length;

    if (highScore >= 2 || requirements.length >= 5) return 'high';
    if (lowScore >= 2 || requirements.length <= 2) return 'low';
    return 'medium';
}

// Extrai requisitos de uma descrição em linguagem natural
export function skillExtractRequirements(task: string): string[] {
    const requirements: string[] = [];
    const t = task.trim();

    // Divide por marcadores comuns
    const lines = t.split(/\n|;|,(?=\s+[a-záéíóúâêîôûãõç])/i);

    lines.forEach(line => {
        const clean = line.replace(/^[-•*\d.)\s]+/, '').trim();
        if (clean.length > 10) {
            requirements.push(clean);
        }
    });

    // Se não encontrou nada estruturado, usa a tarefa inteira como requisito
    if (requirements.length === 0) {
        requirements.push(t);
    }

    return requirements.slice(0, 10); // máximo 10 requisitos
}

// Valida se o briefing está completo
export function skillValidateBriefing(briefing: Partial<Briefing>): boolean {
    return (
        typeof briefing.taskType === 'string' &&
        typeof briefing.summary === 'string' &&
        briefing.summary.length > 0 &&
        Array.isArray(briefing.requirements) &&
        briefing.requirements.length > 0 &&
        typeof briefing.complexity === 'string' &&
        typeof briefing.needsThinker === 'boolean'
    );
}