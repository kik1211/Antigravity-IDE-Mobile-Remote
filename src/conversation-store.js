import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { initCDP } from './cdp/connection.js';
import WebSocket from 'ws';
import { decodeDb } from './conversation-decoder.js';
import { reconstructConversation } from './conversation-reconstructor.js';

class ConversationStore extends EventEmitter {
    constructor() {
        super();
        this.baseDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'conversations');
        this.cache = null;
        this.activeDbPath = null;
        this.watchers = [];
        this.refreshInFlight = null;
    }

    async getActiveConversationId() {
        let domUuids = [];
        try {
            const mainCdp = await initCDP();
            const res = await fetch('http://127.0.0.1:7800/json/list');
            const targets = await res.json();
            const mainTarget = targets.find(t => t.url && t.url.includes('workbench.html'));
            
            if (mainTarget) {
                const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);
                await new Promise((resolve, reject) => {
                    ws.once('open', resolve);
                    ws.once('error', reject);
                    setTimeout(() => reject(new Error('timeout')), 2000);
                });
                
                const sendCommand = (method, params = {}) => new Promise((resolve, reject) => {
                    const id = Math.floor(Math.random() * 100000);
                    const listener = (data) => {
                        const msg = JSON.parse(data.toString());
                        if (msg.id === id) {
                            ws.off('message', listener);
                            if (msg.error) reject(msg.error);
                            else resolve(msg.result);
                        }
                    };
                    ws.on('message', listener);
                    ws.send(JSON.stringify({ id, method, params }));
                });
                
                await sendCommand('Runtime.enable');
                const evalRes = await sendCommand('Runtime.evaluate', {
                    expression: `(function() {
                        const html = document.body.outerHTML;
                        const match = html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/ig);
                        return Array.from(new Set(match || []));
                    })()`,
                    returnByValue: true
                });
                domUuids = evalRes.result.value || [];
                ws.close();
            }
        } catch (err) {
            console.error('CDP UUID extraction failed:', err.message);
        }

        // List files in conversations
        let files = [];
        try {
            files = fs.readdirSync(this.baseDir).filter(f => f.endsWith('.db'));
        } catch (e) {
            return null;
        }

        // Match DOM UUIDs to files, picking the one most recently modified among matches
        let candidates = [];
        for (const file of files) {
            const uuid = file.replace('.db', '');
            const stat = fs.statSync(path.join(this.baseDir, file));
            candidates.push({ uuid, file, mtime: stat.mtimeMs });
        }
        
        candidates.sort((a, b) => b.mtime - a.mtime);

        for (const cand of candidates) {
            if (domUuids.includes(cand.uuid) || domUuids.includes(cand.uuid.toUpperCase())) {
                return cand.uuid;
            }
        }

        // Fallback: mostly recently modified db
        if (candidates.length > 0) {
            console.log('Fallback: Used mtime to guess active conversation', candidates[0].uuid);
            return candidates[0].uuid;
        }
        return null;
    }

    async refresh() {
        if (this.refreshInFlight) return this.refreshInFlight;
        
        this.refreshInFlight = (async () => {
            try {
                const uuid = await this.getActiveConversationId();
                if (!uuid) throw new Error('No active conversation found');
                
                const dbPath = path.join(this.baseDir, `${uuid}.db`);
                
                if (this.activeDbPath !== dbPath) {
                    this.activeDbPath = dbPath;
                    this.setupWatcher(dbPath);
                }

                // Use the imported decodeDb to parse the protobuf
                const rawMessages = decodeDb(dbPath);
                const messages = reconstructConversation(rawMessages);
                
                this.cache = {
                    conversationId: uuid,
                    title: 'Current Conversation',
                    messages
                };
                
                this.emit('updated', this.cache);
                return this.cache;
            } catch (err) {
                console.error('Conversation store refresh error:', err.message);
                return this.cache;
            } finally {
                this.refreshInFlight = null;
            }
        })();
        
        return this.refreshInFlight;
    }

    setupWatcher(dbPath) {
        // Clear old watchers
        for (const w of this.watchers) w.close();
        this.watchers = [];
        
        const walPath = dbPath + '-wal';
        
        const onChange = () => {
            // Debounce
            if (this._watchTimeout) clearTimeout(this._watchTimeout);
            this._watchTimeout = setTimeout(() => {
                this.refresh();
            }, 500);
        };

        try {
            if (fs.existsSync(dbPath)) this.watchers.push(fs.watch(dbPath, onChange));
            if (fs.existsSync(walPath)) this.watchers.push(fs.watch(walPath, onChange));
        } catch (err) {
            console.error('Failed to setup DB watcher', err);
        }
    }

    async getCurrentConversation() {
        if (!this.cache) {
            await this.refresh();
        }
        return this.cache;
    }
}

export const conversationStore = new ConversationStore();
