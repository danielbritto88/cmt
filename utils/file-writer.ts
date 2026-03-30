import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// CAMINHO RAIZ DO PROJETO ALVO
// ─────────────────────────────────────────────

const PROJECT_ROOT = 'C:\\Users\\danie\\OneDrive\\Área de Trabalho\\MeusProjetos\\Avox';

// ─────────────────────────────────────────────
// INTERFACE
// ─────────────────────────────────────────────

export interface FileToWrite {
    filePath: string;
    content: string;
}

// ─────────────────────────────────────────────
// EXTRAI BLOCOS DE ARQUIVO DO RESULTADO
// ─────────────────────────────────────────────

export function extractFilesFromResult(result: string): FileToWrite[] {
    const files: FileToWrite[] = [];

    // Detecta blocos no formato:
    // // FILE: caminho/do/arquivo.ext
    // (conteúdo)
    // // END_FILE

    const pattern = /\/\/ FILE: (.+?)\n([\s\S]*?)\/\/ END_FILE/g;
    let match;

    while ((match = pattern.exec(result)) !== null) {
        const filePath = match[1].trim();
        const content = match[2].trim();
        files.push({ filePath, content });
    }

    // Detecta também blocos markdown com nome de arquivo acima:
    // ```linguagem (caminho/do/arquivo.ext)
    // (conteúdo)
    // ```

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
        const absolutePath = path.join(PROJECT_ROOT, file.filePath);
        const dir = path.dirname(absolutePath);

        // Cria os diretórios intermediários se não existirem
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
    const absolutePath = path.join(PROJECT_ROOT, filePath);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`[FileWriter] ✓ Arquivo criado: ${absolutePath}`);
}