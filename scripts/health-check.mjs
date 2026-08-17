import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

async function checkPortOpen(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
}

function printStatus(name, success, message) {
    if (success) {
        console.log(`${c.green}PASS:${c.reset} ${name} - ${message}`);
    } else {
        console.log(`${c.red}FAIL:${c.reset} ${name} - ${message}`);
    }
}

function printWarn(name, message) {
    console.log(`${c.yellow}WARN:${c.reset} ${name} - ${message}`);
}

async function run() {
    console.log(`\n${c.cyan}=== Antigravity Mobile Remote Health Check ===${c.reset}\n`);

    // 1. Node Version
    const versionMatch = process.version.match(/^v(\d+)\.(\d+)\./);
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    if (major > 22 || (major === 22 && minor >= 5)) {
        printStatus('Node Version', true, process.version);
    } else {
        printStatus('Node Version', false, `${process.version} (Required: v22.5.0+)`);
    }

    // 2. Project Directory
    if (path.basename(projectRoot) === 'OmniAntigravityLite') {
        printStatus('Project Directory', true, projectRoot);
    } else {
        printWarn('Project Directory', `${projectRoot} (Expected folder named OmniAntigravityLite)`);
    }

    // 3. Required Production Files
    const requiredFiles = ['launcher.js', 'package.json', 'src/server.js', 'public/minimal.html'];
    let allFilesExist = true;
    for (const f of requiredFiles) {
        if (!fs.existsSync(path.join(projectRoot, f))) {
            allFilesExist = false;
            printStatus('Production Files', false, `Missing ${f}`);
        }
    }
    if (allFilesExist) printStatus('Production Files', true, 'All core files present');

    // 4. Dependencies
    const nmPath = path.join(projectRoot, 'node_modules');
    if (fs.existsSync(nmPath)) {
        printStatus('Dependencies', true, 'node_modules exists');
    } else {
        printStatus('Dependencies', false, 'node_modules missing (run npm install)');
    }

    // 5. .env
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
        printStatus('Environment', true, '.env file present');
    } else {
        printStatus('Environment', false, '.env file missing');
    }

    // 6. CDP Port
    const cdpOpen = await checkPortOpen(7800);
    if (cdpOpen) {
        printStatus('CDP 7800', true, 'Port is open (Antigravity IDE connected)');
    } else {
        printWarn('CDP 7800', 'Port is closed (Antigravity IDE might not be running)');
    }

    // 7. Server Port
    const serverOpen = await checkPortOpen(process.env.PORT || 4747);
    if (serverOpen) {
        printStatus('Server 4747', true, 'Port is open');
    } else {
        printWarn('Server 4747', 'Port is closed (Server might not be running)');
    }

    // 8. Antigravity Data Paths
    const geminiDir = path.join(os.homedir(), '.gemini', 'antigravity-ide');
    const convDir = path.join(geminiDir, 'conversations');
    const brainDir = path.join(geminiDir, 'brain');

    if (fs.existsSync(convDir)) {
        printStatus('Conversations Data', true, convDir);
    } else {
        printStatus('Conversations Data', false, `Missing ${convDir}`);
    }

    if (fs.existsSync(brainDir)) {
        printStatus('Brain Data', true, brainDir);
    } else {
        printStatus('Brain Data', false, `Missing ${brainDir}`);
    }

    // 9. Active Conversation DB
    if (fs.existsSync(convDir)) {
        const dbs = fs.readdirSync(convDir).filter(f => f.endsWith('.db'));
        if (dbs.length > 0) {
            printStatus('Active DB', true, `Found ${dbs.length} databases`);
        } else {
            printWarn('Active DB', 'No SQLite databases found in conversations directory');
        }
    }
    
    // 10. Initialization Checks
    try {
        const { conversationStore } = await import('../src/conversation-store.js');
        if (conversationStore && conversationStore.baseDir) {
            printStatus('Conversation Store', true, 'Initialized successfully');
        }
    } catch (e) {
        printStatus('Conversation Store', false, `Init failed: ${e.message}`);
    }

    try {
        const { quotaService } = await import('../src/quota-service.js');
        if (quotaService) {
            printStatus('Quota Service', true, 'Initialized successfully');
        }
    } catch (e) {
        printStatus('Quota Service', false, `Init failed: ${e.message}`);
    }

    console.log(`\n${c.cyan}========================================${c.reset}\n`);
}

run().catch(console.error);
