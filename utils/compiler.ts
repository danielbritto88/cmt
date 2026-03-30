import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestFailure } from '../types/index';

// ─────────────────────────────────────────────
// VALIDAÇÃO REAL DE CÓDIGO TYPESCRIPT
// Roda tsc no código gerado antes de gastar
// tokens do Testador
// ─────────────────────────────────────────────

const TEMP_DIR = path.join(process.cwd(), '.cmt-temp');
const TEMP_FILE = path.join(TEMP_DIR, 'validate.ts');

function ensureTempDir(): void {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

function cleanup(): void {
    try {
        if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);
        if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);
    } catch {
        // falha silenciosa — arquivo temporário não crítico
    }
}

// Extrai blocos de código TypeScript de uma resposta
function extractCode(result: string): string {
    // Remove blocos markdown se existirem
    const clean = result
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/^```\n?/gm, '')
        .trim();
    return clean;
}

// Roda tsc e retorna lista de erros encontrados
export function skillCompileTypeScript(code: string): {
    success: boolean;
    failures: TestFailure[];
} {
    // Se não parece código TypeScript, pula a validação
    const looksLikeCode =
        code.includes('function ') ||
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
        execSync(
            `npx tsc "${TEMP_FILE}" --noEmit --skipLibCheck --target ES2022 --moduleResolution node --esModuleInterop true`,
            { stdio: 'pipe' }
        );

        cleanup();
        return { success: true, failures: [] };

    } catch (error: unknown) {
        cleanup();

        const output = error instanceof Error && 'stderr' in error
            ? String((error as NodeJS.ErrnoException & { stderr?: Buffer }).stderr)
            : String(error);

        // Parseia os erros do tsc
        const lines = output.split('\n').filter(l => l.includes('error TS'));
        const failures: TestFailure[] = lines.slice(0, 5).map(line => {
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