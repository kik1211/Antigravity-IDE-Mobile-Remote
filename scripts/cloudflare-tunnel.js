#!/usr/bin/env node
// @ts-check
/**
 * Cloudflare Quick Tunnel manager for local development and remote mobile access.
 *
 * @module scripts/cloudflare-tunnel
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';

const DEFAULT_BIN = process.env.CLOUDFLARE_TUNNEL_BIN || 'cloudflared';

/**
 * @param {string} text
 * @returns {string | null}
 */
function extractTunnelUrl(text) {
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    return match ? match[0] : null;
}

export class CloudflareTunnelManager extends EventEmitter {
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
     * @returns {Promise<string>}
     */
    async start(port) {
        if (this.process && this.url) {
            return this.url;
        }

        if (this.process) {
            await this.stop();
        }

        this.url = '';
        this.error = '';
        this.startedAt = new Date().toISOString();
        const args = ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'];

        this.process = spawn(DEFAULT_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        return new Promise((resolvePromise, rejectPromise) => {
            const settleError = (message) => {
                this.error = message;
                this.pushLog('system', message);
                this.process = null;
                rejectPromise(new Error(message));
            };

            this.process.stdout.on('data', (chunk) => {
                const text = chunk.toString();
                this.pushLog('stdout', text);
                const url = extractTunnelUrl(text);
                if (url && !this.url) {
                    this.url = url;
                    this.emit('url', url);
                    resolvePromise(url);
                }
            });

            this.process.stderr.on('data', (chunk) => {
                const text = chunk.toString();
                this.pushLog('stderr', text);
                const url = extractTunnelUrl(text);
                if (url && !this.url) {
                    this.url = url;
                    this.emit('url', url);
                    resolvePromise(url);
                }
            });

            this.process.on('error', (error) => {
                settleError(`Failed to start cloudflared: ${error.message}`);
            });

            this.process.on('close', (code) => {
                const message = `Cloudflare tunnel exited with code ${code ?? 0}`;
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
                    settleError('Timed out waiting for Cloudflare tunnel URL');
                }
            }, 20000);
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.process) return;

        this.process.kill('SIGTERM');
        this.pushLog('system', 'Cloudflare tunnel stop requested');
        this.process = null;
        this.url = '';
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.argv[2] || process.env.PORT || 4747);
    const tunnel = new CloudflareTunnelManager();
    tunnel.start(port)
        .then((url) => {
            console.log(url);
        })
        .catch((error) => {
            console.error(error.message);
            process.exit(1);
        });
}
