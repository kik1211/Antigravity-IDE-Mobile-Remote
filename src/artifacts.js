// @ts-check
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Gets the path to the Antigravity brain directory
 * @returns {string}
 */
function getBrainPath() {
    return path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
}

async function listProjectFiles() {
    const projectRoot = process.cwd();
    const files = [];
    const maxFiles = 30;
    
    const excludedDirs = new Set(['node_modules', '.git', '.gemini', 'coverage', 'dist', 'build', 'tmp', 'temp', 'test']);
    const excludedExts = new Set(['.db', '.sqlite', '.sqlite3', '.log', '.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.env']);
    const allowedExts = new Set(['.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.css', '.html', '.xml', '.yaml', '.yml', '.ts', '.tsx', '.py', '.c', '.cpp', '.h', '.hpp', '.sh', '.ps1']);
    
    async function walkProject(dir, baseRel = '') {
        try {
            const entries = await fsp.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') && entry.name !== '.env') continue;
                if (entry.name === '.env') continue;
                if (excludedDirs.has(entry.name) && entry.isDirectory()) continue;
                
                const fullPath = path.join(dir, entry.name);
                const relPath = baseRel ? `${baseRel}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                    await walkProject(fullPath, relPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (allowedExts.has(ext) && !excludedExts.has(ext)) {
                        const stat = await fsp.stat(fullPath);
                        files.push({
                            name: entry.name,
                            id: `project://${relPath}`,
                            size: stat.size,
                            modified: stat.mtime.toISOString(),
                            isProjectFile: true,
                            relPath: relPath
                        });
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }
    
    await walkProject(projectRoot);
    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    return files.slice(0, maxFiles);
}

import { cdpConnection } from './state.js';

/**
 * Finds the most recently modified conversation directory in the brain folder
 * @returns {Promise<string>}
 */
async function getActiveConversationPath() {
    const brainPath = getBrainPath();
    if (!fs.existsSync(brainPath)) {
        throw new Error('Brain directory not found');
    }

    let activeUuid = null;

    // Strategy 1: Use live CDP to find the exact conversation ID in the DOM
    if (cdpConnection) {
        try {
            const res = await cdpConnection.call('Runtime.evaluate', {
                expression: `(() => {
                    const regex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
                    const uuids = new Set();
                    for (let el of document.querySelectorAll('*')) {
                        for (let attr of el.attributes) {
                            let m = regex.exec(attr.value);
                            if (m) uuids.add(m[1]);
                        }
                    }
                    return Array.from(uuids);
                })()`,
                returnByValue: true
            });
            if (res.result && res.result.value && Array.isArray(res.result.value)) {
                for (const uuid of res.result.value) {
                    const checkPath = path.join(brainPath, uuid.toLowerCase());
                    if (fs.existsSync(checkPath)) {
                        activeUuid = uuid.toLowerCase();
                        break;
                    }
                }
            }
        } catch (e) {
            // Ignore CDP errors
        }
    }

    // Strategy 2: SQLite WAL File (Filesystem)
    // The active Antigravity session will have an active -wal file for its database.
    if (!activeUuid) {
        const convDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'conversations');
        if (fs.existsSync(convDir)) {
            const entries = await fsp.readdir(convDir, { withFileTypes: true });
            let latestTime = 0;
            
            for (const entry of entries) {
                if (entry.name.endsWith('.db-wal')) {
                    const stat = await fsp.stat(path.join(convDir, entry.name));
                    if (stat.mtimeMs > latestTime) {
                        latestTime = stat.mtimeMs;
                        activeUuid = entry.name.replace('.db-wal', '');
                    }
                }
            }
        }
    }

    // Strategy 3: Fallback to directory mtime
    if (!activeUuid) {
        const entries = await fsp.readdir(brainPath, { withFileTypes: true });
        let latestTime = 0;
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== '.system_generated') {
                const fullPath = path.join(brainPath, entry.name);
                try {
                    const stat = await fsp.stat(fullPath);
                    if (stat.mtimeMs > latestTime) {
                        latestTime = stat.mtimeMs;
                        activeUuid = entry.name;
                    }
                } catch (e) {}
            }
        }
    }

    if (!activeUuid) {
        throw new Error('No conversations found in brain directory');
    }

    return path.join(brainPath, activeUuid);
}

/**
 * Lists markdown files in the active conversation directory
 */
export async function listArtifacts() {
    try {
        const activePath = await getActiveConversationPath();
        const files = [];

        async function walk(dir, baseRel = '') {
            const entries = await fsp.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                // Skip system generated hidden folders unless specifically requested, but artifacts shouldn't be there
                if (entry.name === '.system_generated' || entry.name.startsWith('.')) continue;

                const fullPath = path.join(dir, entry.name);
                const relPath = baseRel ? `${baseRel}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                    await walk(fullPath, relPath);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    const stat = await fsp.stat(fullPath);
                    files.push({
                        name: entry.name,
                        id: relPath,
                        size: stat.size,
                        modified: stat.mtime.toISOString()
                    });
                }
            }
        }

        await walk(activePath);
        
        // Sort by modified time descending (newest first)
        files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
        
        const projectFiles = await listProjectFiles();
        
        return {
            available: true,
            conversationId: path.basename(activePath),
            files,
            projectFiles
        };
    } catch (e) {
        if (e.code === 'ENOENT') return { available: false, files: [], projectFiles: [] };
        throw e;
    }
}

/**
 * Safely reads an artifact file
 * @param {string} filename 
 */
export async function readArtifact(id) {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid identifier');
    }
    
    if (id.startsWith('project://')) {
        const relPath = id.substring('project://'.length);
        const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
        if (normalized.includes('..')) {
            throw new Error('Path traversal detected');
        }
        
        const projectRoot = process.cwd();
        const filePath = path.resolve(projectRoot, normalized);
        
        if (!filePath.startsWith(path.resolve(projectRoot))) {
            throw new Error('Path resolution error');
        }
        
        const basename = path.basename(filePath);
        const ext = path.extname(basename).toLowerCase();
        const excludedExts = new Set(['.db', '.sqlite', '.sqlite3', '.log', '.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.env']);
        const excludedNames = new Set(['.env']);
        const excludedDirs = ['node_modules', '.git', '.gemini'];
        
        if (excludedExts.has(ext) || excludedNames.has(basename) || basename.startsWith('.env.')) {
            throw new Error('Access denied to sensitive file');
        }
        
        for (const dir of excludedDirs) {
            if (filePath.includes(path.sep + dir + path.sep) || filePath.endsWith(path.sep + dir)) {
                throw new Error('Access denied to sensitive directory');
            }
        }
        
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) throw new Error('Not a file');
        if (stat.size > 2 * 1024 * 1024) throw new Error('File too large');
        
        return await fsp.readFile(filePath, 'utf8');
    }
    
    // Prevent directory traversal
    const normalized = path.normalize(id).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..')) {
        throw new Error('Path traversal detected');
    }
    
    if (!id.endsWith('.md')) {
        throw new Error('Only markdown files are supported');
    }

    const activePath = await getActiveConversationPath();
    const filePath = path.resolve(activePath, normalized);

    // Final security check: ensure it really is inside the active directory
    if (!filePath.startsWith(path.resolve(activePath))) {
        throw new Error('Path resolution error');
    }

    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
        throw new Error('Not a file');
    }
    
    // Limit to 1MB just in case
    if (stat.size > 1024 * 1024) {
        throw new Error('File too large');
    }

    return await fsp.readFile(filePath, 'utf8');
}
