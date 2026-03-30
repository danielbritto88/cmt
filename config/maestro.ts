import * as dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────
// CONFIGURAÇÃO CENTRAL DO CMT 1.0
// ─────────────────────────────────────────────

export const CMT_CONFIG = {

    // Versão do workflow
    version: '1.0.0',

    // Modo proativo — desativado por padrão
    // Não ative sem familiaridade com os custos do sistema
    proactiveMode: process.env.PROACTIVE_MODE === 'true',

    // Máximo de ciclos Testador → Corretor antes de escalar
    maxCorrectionCycles: parseInt(process.env.MAX_CORRECTION_CYCLES || '3'),

    // Dias até o cache de modelos/preços ser considerado expirado
    cacheTtlDays: parseInt(process.env.CACHE_TTL_DAYS || '5'),

    // Limite de alerta de tokens por sessão (avisa mas não para)
    tokenAlertThreshold: parseInt(process.env.TOKEN_ALERT_THRESHOLD || '100000'),

    // Limite absoluto de tokens por sessão (0 = desativado)
    tokenHardStop: parseInt(process.env.MAX_TOKENS_HARD_STOP || '0'),

    // Log detalhado de cada agente no terminal
    verbose: process.argv.includes('--verbose'),

    // Exibir relatório de custo ao final
    showCost: process.argv.includes('--cost') || process.argv.includes('--verbose'),

    // Modo interativo
    interactive: process.argv.includes('--interactive'),

} as const;

// ─────────────────────────────────────────────
// VALIDAÇÃO NA INICIALIZAÇÃO
// ─────────────────────────────────────────────

export function validateConfig(): void {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('\n[CMT] ERRO: ANTHROPIC_API_KEY não encontrada no arquivo .env');
        console.error('[CMT] Copie o arquivo .env.example para .env e adicione sua chave.\n');
        process.exit(1);
    }

    if (process.env.ANTHROPIC_API_KEY === 'sk-ant-api03-...') {
        console.error('\n[CMT] ERRO: Você ainda está usando a chave de exemplo no .env');
        console.error('[CMT] Substitua pelo valor real da sua chave da Anthropic.\n');
        process.exit(1);
    }
}