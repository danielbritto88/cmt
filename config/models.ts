import * as fs from 'fs';
import * as path from 'path';
import { ModelsCache, ModelTier } from '../types/index';

const CACHE_PATH = path.join(__dirname, 'models-cache.json');
const TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || '5');

// ─────────────────────────────────────────────
// VALORES PADRÃO (usados se cache não existir)
// ─────────────────────────────────────────────

const DEFAULT_CACHE: ModelsCache = {
    lastUpdated: new Date().toISOString(),
    models: {
        haiku: process.env.DEFAULT_MODEL_HAIKU || 'claude-haiku-4-5-20251001',
        sonnet: process.env.DEFAULT_MODEL_SONNET || 'claude-sonnet-4-6',
        opus: process.env.DEFAULT_MODEL_OPUS || 'claude-opus-4-6',
    },
    pricing: {
        haiku: { inputPer1M: 1.00, outputPer1M: 5.00 },
        sonnet: { inputPer1M: 3.00, outputPer1M: 15.00 },
        opus: { inputPer1M: 5.00, outputPer1M: 25.00 },
    }
};

// ─────────────────────────────────────────────
// LEITURA E VALIDAÇÃO DO CACHE
// ─────────────────────────────────────────────

function isCacheValid(): boolean {
    if (!fs.existsSync(CACHE_PATH)) return false;
    try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        const cache: ModelsCache = JSON.parse(raw);
        const lastUpdated = new Date(cache.lastUpdated);
        const diffDays = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < TTL_DAYS;
    } catch {
        return false;
    }
}

function loadCache(): ModelsCache {
    try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return DEFAULT_CACHE;
    }
}

function saveCache(cache: ModelsCache): void {
    try {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    } catch {
        // falha silenciosa — usa os valores padrão
    }
}

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────

function initCache(): ModelsCache {
    if (isCacheValid()) {
        return loadCache();
    }
    // Cache expirado ou inexistente — salva os padrões com data atual
    const fresh: ModelsCache = {
        ...DEFAULT_CACHE,
        lastUpdated: new Date().toISOString(),
    };
    saveCache(fresh);
    return fresh;
}

export const modelsCache = initCache();

// ─────────────────────────────────────────────
// ACESSO AOS MODELOS E PREÇOS
// ─────────────────────────────────────────────

export function getModelString(tier: ModelTier): string {
    return modelsCache.models[tier];
}

export function getPricing(tier: ModelTier) {
    return modelsCache.pricing[tier];
}

export function estimateCost(
    tier: ModelTier,
    inputTokens: number,
    outputTokens: number
): number {
    const p = getPricing(tier);
    return (inputTokens / 1_000_000) * p.inputPer1M +
        (outputTokens / 1_000_000) * p.outputPer1M;
}