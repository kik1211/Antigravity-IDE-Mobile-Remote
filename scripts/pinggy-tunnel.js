#!/usr/bin/env node
// @ts-check
/**
 * Pinggy tunnel manager via SSH reverse tunnel.
 *
 * @module scripts/pinggy-tunnel
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';

const DEFAULT_BIN = process.env.PINGGY_SSH_BIN || 'ssh';
const DEFAULT_HOST = process.env.PINGGY_HOST || 'a.pinggy.io';

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractTunnelUrls(text) {
    const clean = text.replace(/\u001b\[[0-9;]*m/g, '');
    const matches = clean.match(/https?:\/\/[^\s"'`]+/gi) || [];
    return matches
        .map((url) => url.replace(/[),.;]+$/, ''))
        .filter((url) => /pinggy/i.test(url));
}

export class PinggyTunnelManager extends EventEmitter {
    constructor() {
        super();
        /** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
        this.process = null;
        this.url = '';
        this.logs = [];
        this.startedAt = '';
        this.error = '';
    }

    /**
     * @private
     * @param {'stdout' | 'stderr' | 'system'} stream
     * @param {string} text
     */
    pushLog(stream, text) {
        const line = text.toString();
        this.logs.push({
            stream,
            text: line,
            timestamp: new Date().toISOString()
        });
        this.logs = this.logs.slice(-100);
        this.emit('log', { stream, text: line });
    }

    /**
     * @returns {{active: boolean, url: string, startedAt: string, error: string, logs: Array<{stream: string, text: string, timestamp: string}>}}
     */
    getStatus() {
        return {
            active: !!this.process,
            url: this.url,
            startedAt: this.startedAt,
            error: this.error,
            logs: this.logs
        };
    }

    /**
     * @param {number} port
     * @param {{tls?: boolean, sniServerName?: string}} [options]
     * @returns {Promise<string>}
     */
    async start(port, options = {}) {
        if (this.process && this.url) {
            return this.url;
        }

        if (this.process) {
            await this.stop();
        }

        this.url = '';
        this.error = '';
        this.startedAt = new Date().toISOString();

        const token = String(process.env.PINGGY_TOKEN || '').trim();
        const host = DEFAULT_HOST;
        const remoteOptions = [];

        if (options.tls) {
            const suffix = options.sniServerName ? `:${options.sniServerName}` : '';
            remoteOptions.push(`x:localServerTls${suffix}`);
        }

        const args = [
            '-p', '443',
            '-T',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'ServerAliveInterval=30',
            '-o', 'ExitOnForwardFailure=yes',
            '-R', `0:127.0.0.1:${port}`
        ];

        if (token) {
            args.push('-l', token);
        }

        args.push(host);
        args.push(...remoteOptions);

        this.process = spawn(DEFAULT_BIN, args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return new Promise((resolvePromise, rejectPromise) => {
            let settled = false;

            const settleError = (message) => {
                if (settled) return;
                settled = true;
                this.error = message;
                this.pushLog('system', message);
                this.process = null;
                rejectPromise(new Error(message));
            };

            const maybeResolveUrl = (chunk) => {
                const text = chunk.toString();
                const urls = extractTunnelUrls(text);
                if (urls.length === 0 || settled) return;

                const httpsUrl = urls.find((url) => url.startsWith('https://')) || urls[0];
                settled = true;
                this.url = httpsUrl;
                this.emit('url', httpsUrl);
                resolvePromise(httpsUrl);
            };

            this.process.stdout.on('data', (chunk) => {
                this.pushLog('stdout', chunk.toString());
                maybeResolveUrl(chunk);
            });

            this.process.stderr.on('data', (chunk) => {
                this.pushLog('stderr', chunk.toString());
                maybeResolveUrl(chunk);
            });

            this.process.on('error', (error) => {
                settleError(`Failed to start Pinggy tunnel: ${error.message}`);
            });

            this.process.on('close', (code) => {
                const message = `Pinggy tunnel exited with code ${code ?? 0}`;
                this.pushLog('system', message);
                this.process = null;
                if (!this.url) {
                    settleError(message);
                } else {
                    this.url = '';
                    this.emit('exit', code ?? 0);
                }
            });

            setTimeout(() => {
                if (!this.url) {
                    settleError('Timed out waiting for Pinggy tunnel URL');
                }
            }, 20000);

            try {
                this.process.stdin.write('\n');
            } catch (_) {}
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.process) return;

        this.process.kill('SIGTERM');
        this.pushLog('system', 'Pinggy tunnel stop requested');
        this.process = null;
        this.url = '';
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.argv[2] || process.env.PORT || 4747);
    const tunnel = new PinggyTunnelManager();
    tunnel.start(port)
        .then((url) => {
            console.log(url);
        })
        .catch((error) => {
            console.error(error.message);
            process.exit(1);
        });
}
