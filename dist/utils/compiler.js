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
exports.skillCompileTypeScript = skillCompileTypeScript;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─────────────────────────────────────────────
// VALIDAÇÃO REAL DE CÓDIGO TYPESCRIPT
// Roda tsc no código gerado antes de gastar
// tokens do Testador
// ─────────────────────────────────────────────
const TEMP_DIR = path.join(process.cwd(), '.cmt-temp');
const TEMP_FILE = path.join(TEMP_DIR, 'validate.ts');
function ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}
function cleanup() {
    try {
        if (fs.existsSync(TEMP_FILE))
            fs.unlinkSync(TEMP_FILE);
        if (fs.existsSync(TEMP_DIR))
            fs.rmdirSync(TEMP_DIR);
    }
    catch {
        // falha silenciosa — arquivo temporário não crítico
    }
}
// Extrai blocos de código TypeScript de uma resposta
function extractCode(result) {
    // Remove blocos markdown se existirem
    const clean = result
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/^```\n?/gm, '')
        .trim();
    return clean;
}
// Roda tsc e retorna lista de erros encontrados
function skillCompileTypeScript(code) {
    // Se não parece código TypeScript, pula a validação
    const looksLikeCode = code.includes('function ') ||
        code.includes('const ') ||
        code.includes('interface ') ||
        code.includes('class ') ||
        code.includes('export ') ||
        code.includes('=>');
    if (!looksLikeCode) {
        return { success: true, failures: [] };
    }
    ensureTempDir();
    const extracted = extractCode(code);
    fs.writeFileSync(TEMP_FILE, extracted, 'utf-8');
    try {
        (0, child_process_1.execSync)(`npx tsc "${TEMP_FILE}" --noEmit --skipLibCheck --target ES2022 --moduleResolution node --esModuleInterop true`, { stdio: 'pipe' });
        cleanup();
        return { success: true, failures: [] };
    }
    catch (error) {
        cleanup();
        const output = error instanceof Error && 'stderr' in error
            ? String(error.stderr)
            : String(error);
        // Parseia os erros do tsc
        const lines = output.split('\n').filter(l => l.includes('error TS'));
        const failures = lines.slice(0, 5).map(line => {
            const match = line.match(/error (TS\d+): (.+)/);
            return {
                requirement: 'Código deve compilar sem erros TypeScript',
                location: line.split('(')[0] || 'Arquivo gerado',
                suggestion: match ? `${match[1]}: ${match[2]}` : line.trim(),
            };
        });
        if (failures.length === 0) {
            failures.push({
                requirement: 'Código deve compilar sem erros TypeScript',
                location: 'Arquivo gerado',
                suggestion: 'Erro de compilação não identificado. Revisar o código gerado.',
            });
        }
        return { success: false, failures };
    }
}
