import Anthropic from '@anthropic-ai/sdk';
import { ModelTier } from '../types/index';
import { getModelString, estimateCost } from '../config/models';
import { CMT_CONFIG } from '../config/maestro';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CallOptions {
    tier: ModelTier;
    system: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    maxTokens?: number;
    agentName?: string;
}

export interface CallResult {
    content: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    model: string;
}

export async function callClaude(options: CallOptions): Promise<CallResult> {
    const { tier, system, messages, maxTokens = 4096, agentName = 'agente' } = options;
    const model = getModelString(tier);

    if (CMT_CONFIG.verbose) {
        console.log(`\n[CMT] → ${agentName} acionado (${model})`);
    }

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            let content = '';
            let inputTokens = 0;
            let outputTokens = 0;

            const stream = await client.messages.stream({
                model,
                max_tokens: maxTokens,
                system,
                messages,
            });

            for await (const event of stream) {
                if (
                    event.type === 'content_block_delta' &&
                    event.delta.type === 'text_delta'
                ) {
                    content += event.delta.text;
                }

                if (event.type === 'message_delta' && event.usage) {
                    outputTokens = event.usage.output_tokens;
                }

                if (event.type === 'message_start' && event.message.usage) {
                    inputTokens = event.message.usage.input_tokens;
                }
            }

            const costUSD = estimateCost(tier, inputTokens, outputTokens);

            if (CMT_CONFIG.verbose) {
                console.log(`[CMT] ✓ ${agentName} concluído — ${inputTokens + outputTokens} tokens | US$ ${costUSD.toFixed(4)}`);
            }

            return { content, inputTokens, outputTokens, costUSD, model };

        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));

            const isRetryable =
                lastError.message.includes('529') ||
                lastError.message.includes('overloaded') ||
                lastError.message.includes('rate_limit') ||
                lastError.message.includes('timeout');

            if (!isRetryable || attempt === MAX_RETRIES) break;

            const waitMs = attempt * 2000;
            console.warn(`[CMT] Tentativa ${attempt} falhou. Aguardando ${waitMs / 1000}s antes de tentar novamente...`);
            await new Promise(r => setTimeout(r, waitMs));
        }
    }

    throw new Error(`[CMT] Falha após ${MAX_RETRIES} tentativas: ${lastError?.message}`);
}