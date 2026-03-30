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
exports.modelsCache = void 0;
exports.getModelString = getModelString;
exports.getPricing = getPricing;
exports.estimateCost = estimateCost;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_PATH = path.join(__dirname, 'models-cache.json');
const TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || '5');
// ─────────────────────────────────────────────
// VALORES PADRÃO (usados se cache não existir)
// ─────────────────────────────────────────────
const DEFAULT_CACHE = {
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
function isCacheValid() {
    if (!fs.existsSync(CACHE_PATH))
        return false;
    try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        const cache = JSON.parse(raw);
        const lastUpdated = new Date(cache.lastUpdated);
        const diffDays = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < TTL_DAYS;
    }
    catch {
        return false;
    }
}
function loadCache() {
    try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return DEFAULT_CACHE;
    }
}
function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    }
    catch {
        // falha silenciosa — usa os valores padrão
    }
}
// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────
function initCache() {
    if (isCacheValid()) {
        return loadCache();
    }
    // Cache expirado ou inexistente — salva os padrões com data atual
    const fresh = {
        ...DEFAULT_CACHE,
        lastUpdated: new Date().toISOString(),
    };
    saveCache(fresh);
    return fresh;
}
exports.modelsCache = initCache();
// ─────────────────────────────────────────────
// ACESSO AOS MODELOS E PREÇOS
// ─────────────────────────────────────────────
function getModelString(tier) {
    return exports.modelsCache.models[tier];
}
function getPricing(tier) {
    return exports.modelsCache.pricing[tier];
}
function estimateCost(tier, inputTokens, outputTokens) {
    const p = getPricing(tier);
    return (inputTokens / 1_000_000) * p.inputPer1M +
        (outputTokens / 1_000_000) * p.outputPer1M;
}
