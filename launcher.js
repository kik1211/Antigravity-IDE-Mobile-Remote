import net from 'node:net';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = path.dirname(new URL(import.meta.url).pathname)
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\//g, '\\');

const SERVER_SCRIPT = path.join(PROJECT_DIR, 'src', 'server.js');
const CDP_HOST = '127.0.0.1';
const CDP_PORT = 7800;
const SERVER_PORT = Number(process.env.PORT || 4747);

function checkPortOpen(host, port, timeoutMs = 750) {
    return new Promise(resolve => {
        const socket = new net.Socket();

        const finish = result => {
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(timeoutMs);

        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));

        socket.connect(port, host);
    });
}

function isWindows() {
    return process.platform === 'win32';
}

function startServer() {
    if (!fs.existsSync(SERVER_SCRIPT)) {
        throw new Error(`Server script not found: ${SERVER_SCRIPT}`);
    }

    console.log('');
    console.log(`▶ Starting OmniAntigravityLite server on port ${SERVER_PORT}...`);

    const server = spawn(
        process.execPath,
        [SERVER_SCRIPT],
        {
            cwd: PROJECT_DIR,
            env: {
                ...process.env,
                PORT: String(SERVER_PORT)
            },
            stdio: 'inherit',
            windowsHide: false
        }
    );

    server.once('error', error => {
        console.error(`✗ Failed to start server: ${error.message}`);
        process.exit(1);
    });

    server.once('exit', code => {
        process.exit(code ?? 0);
    });
}

async function ensureAntigravityCDP() {
    if (await checkPortOpen(CDP_HOST, CDP_PORT)) {
        console.log(`✓ Antigravity CDP available on ${CDP_PORT}`);
        return;
    }

    console.log('');
    console.log('✗ ERROR: Antigravity IDE CDP is not reachable.');
    console.log('  Please use start.bat to launch OmniAntigravityLite.');
    console.log('');
    process.exit(1);
}

async function main() {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   OmniAntigravity Remote Chat            ║');
    console.log('  ║   Mobile Remote Control for AI Sessions  ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');

    const args = process.argv.slice(2);
    const modeIndex = args.indexOf('--mode');
    const mode = modeIndex !== -1 ? args[modeIndex + 1] : 'local';

    if (mode === 'web') {
        console.log('  Mode: 🌐 Web Access');
    } else {
        console.log('  Mode: 📶 Local (Wi-Fi)');
    }
    console.log('');

    if (!isWindows()) {
        console.error('✗ This launcher currently requires Windows.');
        process.exit(1);
    }

    // Safety check. Actual launching happens in start.bat / start_web.bat
    await ensureAntigravityCDP();

    startServer();
}

main().catch(error => {
    console.error('');
    console.error(`✗ Launcher error: ${error.message}`);
    process.exit(1);
});