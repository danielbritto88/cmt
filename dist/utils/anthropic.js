"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callClaude = callClaude;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const models_1 = require("../config/models");
const maestro_1 = require("../config/maestro");
const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
// ─────────────────────────────────────────────
// CHAMADA PRINCIPAL COM RETRY
// ─────────────────────────────────────────────
async function callClaude(options) {
    const { tier, system, messages, maxTokens = 4096, agentName = 'agente' } = options;
    const model = (0, models_1.getModelString)(tier);
    if (maestro_1.CMT_CONFIG.verbose) {
        console.log(`\n[CMT] → ${agentName} acionado (${model})`);
    }
    const MAX_RETRIES = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                system,
                messages,
            });
            const content = response.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('');
            const inputTokens = response.usage.input_tokens;
            const outputTokens = response.usage.output_tokens;
            const costUSD = (0, models_1.estimateCost)(tier, inputTokens, outputTokens);
            if (maestro_1.CMT_CONFIG.verbose) {
                console.log(`[CMT] ✓ ${agentName} concluído — ${inputTokens + outputTokens} tokens | US$ ${costUSD.toFixed(4)}`);
            }
            return { content, inputTokens, outputTokens, costUSD, model };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const isRetryable = lastError.message.includes('529') ||
                lastError.message.includes('overloaded') ||
                lastError.message.includes('rate_limit') ||
                lastError.message.includes('timeout');
            if (!isRetryable || attempt === MAX_RETRIES)
                break;
            const waitMs = attempt * 2000;
            console.warn(`[CMT] Tentativa ${attempt} falhou. Aguardando ${waitMs / 1000}s antes de tentar novamente...`);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw new Error(`[CMT] Falha após ${MAX_RETRIES} tentativas: ${lastError?.message}`);
}
