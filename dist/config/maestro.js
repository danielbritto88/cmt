"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMT_CONFIG = void 0;
exports.validateConfig = validateConfig;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// ─────────────────────────────────────────────
// CONFIGURAÇÃO CENTRAL DO CMT 1.0
// ─────────────────────────────────────────────
exports.CMT_CONFIG = {
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
};
// ─────────────────────────────────────────────
// VALIDAÇÃO NA INICIALIZAÇÃO
// ─────────────────────────────────────────────
function validateConfig() {
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
