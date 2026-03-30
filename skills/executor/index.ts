import { AgentInput } from '../../types/index';

// ─────────────────────────────────────────────
// SKILLS DO EXECUTOR
// Contextos especializados e funções auxiliares
// ─────────────────────────────────────────────

// ── Contextos injetáveis por domínio ──────────

export const FRONTEND_CONTEXT = `Conhecimento de frontend:
- Stack: React 18 + TypeScript + MUI 5
- Componentes funcionais com hooks (useState, useEffect, useCallback, useMemo)
- Nunca usar 'any' — sempre tipar corretamente
- Nomes de componentes em PascalCase
- Arquivos de componente: NomeDoComponente.tsx
- Props sempre tipadas com interface própria
- Estilização via sx prop ou styled components do MUI
- Evitar re-renders desnecessários`;

export const BACKEND_CONTEXT = `Conhecimento de backend:
- Stack: Spring Boot 3.2 + Java 17
- Padrão obrigatório: Controller → Service → Repository
- ResponseEntity<T> para todas as respostas HTTP
- Validação com Bean Validation (@Valid, @NotNull, @NotBlank)
- Nomes de classes em PascalCase, métodos em camelCase
- DTOs para entrada e saída — nunca expor entidades diretamente
- Tratamento de exceções com @ControllerAdvice
- Transações com @Transactional no service`;

export const SAAS_CONTEXT = `Conhecimento de automação SaaS:
- Sempre validar autenticação antes de chamar APIs externas
- Tratar rate limits com retry exponencial (1s, 2s, 4s)
- Logar erros com contexto suficiente para debug
- Preferir operações idempotentes
- Timeout máximo de 30s por chamada externa
- Nunca expor tokens ou chaves em logs`;

export const TYPESCRIPT_CONTEXT = `Boas práticas TypeScript:
- Sem 'any' — usar 'unknown' quando o tipo não é conhecido
- Interfaces para objetos, types para unions e primitivos
- Funções com tipos de retorno explícitos
- Async/await — nunca callbacks aninhados
- Tratamento de erro com try/catch tipado`;

// ── Seleção de contexto por tipo de tarefa ────

export function skillGetContext(taskType: string): string {
    switch (taskType) {
        case 'code':
            return `${TYPESCRIPT_CONTEXT}\n\n${FRONTEND_CONTEXT}\n\n${BACKEND_CONTEXT}`;
        case 'saas_automation':
            return `${SAAS_CONTEXT}\n\n${TYPESCRIPT_CONTEXT}`;
        case 'content':
            return '';
        case 'analysis':
            return '';
        default:
            return TYPESCRIPT_CONTEXT;
    }
}

// ── Validação do input antes de executar ──────

export function skillValidateExecutorInput(input: AgentInput): {
    valid: boolean;
    reason?: string;
} {
    if (!input.task || input.task.trim().length === 0) {
        return { valid: false, reason: 'Tarefa vazia.' };
    }

    if (!input.briefing) {
        return { valid: false, reason: 'Briefing ausente — Analista deve rodar primeiro.' };
    }

    if (input.briefing.requirements.length === 0) {
        return { valid: false, reason: 'Nenhum requisito identificado no briefing.' };
    }

    return { valid: true };
}

// ── Formatação do resultado para entrega ──────

export function skillFormatResult(result: string, taskType: string): string {
    if (taskType === 'code') {
        // Remove blocos de markdown se o modelo os adicionou
        return result
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/^```\n?/gm, '')
            .trim();
    }
    return result.trim();
}

// ── Estimativa de maxTokens por tipo ──────────

export function skillGetMaxTokens(taskType: string): number {
    const limits: Record<string, number> = {
        code: 25000,
        content: 15000,
        analysis: 8000,
        saas_automation: 30000,
        unknown: 10000,
    };
    return limits[taskType] ?? 10000;
}