import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// CAMINHO RAIZ DO PROJETO ALVO
// ─────────────────────────────────────────────

const PROJECT_ROOT = 'C:\\Users\\danie\\OneDrive\\Área de Trabalho\\MeusProjetos\\Avox';

// ─────────────────────────────────────────────
// PASTAS PERMITIDAS PARA ESCRITA
// ─────────────────────────────────────────────

const ALLOWED_PATHS = [
    'frontend/src',
    'src/main/java',
    'src/test/java',
    'database',
];

// Arquivos na raiz que podem ser criados/atualizados
const ALLOWED_ROOT_FILES = [
    'CLARA_ROADMAP.md',
    '.env.example',
    'README.md',
];

// ─────────────────────────────────────────────
// INTERFACE
// ─────────────────────────────────────────────

export interface FileToWrite {
    filePath: string;
    content: string;
}

// ─────────────────────────────────────────────
// VALIDAÇÃO DE CAMINHO
// ─────────────────────────────────────────────

function isPathAllowed(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    // Bloqueia caminhos absolutos
    if (path.isAbsolute(filePath)) {
        console.warn(`[FileWriter] ⚠️  Bloqueado — caminho absoluto não permitido: ${filePath}`);
        return false;
    }

    // Bloqueia tentativas de sair da raiz
    if (normalized.includes('../')) {
        console.warn(`[FileWriter] ⚠️  Bloqueado — tentativa de sair da raiz: ${filePath}`);
        return false;
    }

    // Permite arquivos específicos na raiz
    if (!normalized.includes('/')) {
        if (ALLOWED_ROOT_FILES.includes(normalized)) {
            return true;
        }
        console.warn(`[FileWriter] ⚠️  Bloqueado — arquivo na raiz não permitido: ${filePath}`);
        return false;
    }

    // Verifica se está dentro de uma pasta permitida
    const isAllowed = ALLOWED_PATHS.some(allowed => normalized.startsWith(allowed));
    if (!isAllowed) {
        console.warn(`[FileWriter] ⚠️  Bloqueado — pasta não permitida: ${filePath}`);
        console.warn(`[FileWriter]    Pastas permitidas: ${ALLOWED_PATHS.join(', ')}`);
    }
    return isAllowed;
}

// ─────────────────────────────────────────────
// PROTEÇÃO DO CLARA_ROADMAP.md
// ─────────────────────────────────────────────

function isRoadmapUpdate(filePath: string, content: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized !== 'CLARA_ROADMAP.md') return true;

    // Só permite sobrescrever o roadmap se o conteúdo contiver
    // os marcadores esperados do plano original
    const hasExpectedContent =
        content.includes('FASE 1') &&
        content.includes('FASE 2') &&
        content.includes('BUG-') &&
        content.includes('SEC-');

    if (!hasExpectedContent) {
        console.warn(`[FileWriter] ⚠️  Bloqueado — tentativa de substituir CLARA_ROADMAP.md por conteúdo inválido.`);
        console.warn(`[FileWriter]    O conteúdo não contém as seções esperadas da auditoria original.`);
        return false;
    }

    return true;
}

// ─────────────────────────────────────────────
// EXTRAI BLOCOS DE ARQUIVO DO RESULTADO
// ─────────────────────────────────────────────

export function extractFilesFromResult(result: string): FileToWrite[] {
    const files: FileToWrite[] = [];

    const pattern = /\/\/ FILE: (.+?)\n([\s\S]*?)\/\/ END_FILE/g;
    let match;

    while ((match = pattern.exec(result)) !== null) {
        const filePath = match[1].trim();
        const content = match[2].trim();
        files.push({ filePath, content });
    }

    const mdPattern = /```[a-zA-Z]*\s*\((.+?)\)\n([\s\S]*?)```/g;

    while ((match = mdPattern.exec(result)) !== null) {
        const filePath = match[1].trim();
        const content = match[2].trim();
        files.push({ filePath, content });
    }

    return files;
}

// ─────────────────────────────────────────────
// ESCREVE OS ARQUIVOS NO PROJETO
// ─────────────────────────────────────────────

export function writeFilesToProject(files: FileToWrite[]): void {
    if (files.length === 0) return;

    for (const file of files) {
        if (!isPathAllowed(file.filePath)) continue;
        if (!isRoadmapUpdate(file.filePath, file.content)) continue;

        const absolutePath = path.join(PROJECT_ROOT, file.filePath);
        const dir = path.dirname(absolutePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(absolutePath, file.content, 'utf-8');
        console.log(`[FileWriter] ✓ Arquivo criado: ${absolutePath}`);
    }
}

// ─────────────────────────────────────────────
// ESCREVE UM ARQUIVO DIRETAMENTE (SEM EXTRAÇÃO)
// ─────────────────────────────────────────────

export function writeFileDirectly(filePath: string, content: string): void {
    if (!isPathAllowed(filePath)) return;
    if (!isRoadmapUpdate(filePath, content)) return;

    const absolutePath = path.join(PROJECT_ROOT, filePath);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`[FileWriter] ✓ Arquivo criado: ${absolutePath}`);
}

// ─────────────────────────────────────────────
// LÊ UM ARQUIVO DO PROJETO
// ─────────────────────────────────────────────

export function readFileFromProject(filePath: string): string {
    const absolutePath = path.join(PROJECT_ROOT, filePath);
    try {
        if (fs.existsSync(absolutePath)) {
            return fs.readFileSync(absolutePath, 'utf-8');
        }
    } catch {
        // falha silenciosa
    }
    return '';
}