#!/usr/bin/env node
// @ts-check
/**
 * OmniAntigravity Remote Chat ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Main Server
 * Mobile remote control for AI coding sessions via CDP mirroring.
 *
 * @module server
 */
import './env.js';
import { listArtifacts, readArtifact } from './artifacts.js';
import { conversationStore } from './conversation-store.js';

conversationStore.on('updated', () => {
    // Notify clients that the conversation has updated.
    // We use the existing 'snapshot_update' type so the frontend will trigger a reload seamlessly.
    try {
        broadcast({
            type: 'snapshot_update',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        // Ignored if broadcast is not yet ready
    }
});


import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    sendTelegramNotification,
    sendTypedNotification,
    sendActionRequired,
    sendSuggestionRequired,
    initTelegramBot,
    registerTelegramHooks,
    stopBot as stopTelegramBot
} from './utils/telegram.js';

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import WebSocket from 'ws';

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Module Imports ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
import {
    PROJECT_ROOT, PORTS, CONTAINER_IDS, SERVER_PORT, POLL_INTERVAL,
    APP_PASSWORD, COOKIE_SECRET, AUTH_SALT, AUTH_COOKIE_NAME, VERSION,
    JSON_BODY_LIMIT, AUTO_TUNNEL_PROVIDER
} from './config.js';
import * as state from './state.js';
import { getLocalIP, isLocalRequest, getJson } from './utils/network.js';
import { killPortProcess, launchAntigravity } from './utils/process.js';
import { hashString } from './utils/hash.js';
import { discoverCDP, discoverAllCDP, connectCDP, initCDP } from './cdp/connection.js';
import { inspectUI } from './ui_inspector.js';
import { sessionStats } from './session-stats.js';
import { quotaService } from './quota-service.js';
import { screenshotTimeline } from './screenshot-timeline.js';
import {
    ensureWorkspaceData,
    getGitSummary,
    gitAdd,
    gitCommit,
    gitPush,
    listWorkspace,
    loadQuickCommands,
    readWorkspaceFile,
    saveQuickCommands,
    saveUploadedImage,
    terminalManager,
    workspaceRoot,
    uploadsDir
} from './utils/workspace.js';
import { aiSupervisor, suggestQueue, extractPendingCommand } from './supervisor.js';
import { CloudflareTunnelManager } from '../scripts/cloudflare-tunnel.js';
import { PinggyTunnelManager } from '../scripts/pinggy-tunnel.js';

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Mutable State ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

/** @type {import('./state.js').CDPConnection | null} */
let cdpConnection = null;

/** @type {import('./state.js').Snapshot | null} */
let lastSnapshot = null;

/** @type {string | null} */
let lastSnapshotHash = null;

/** @type {import('./state.js').CDPTarget[]} */
let availableTargets = [];

/** @type {string | null} */
let activeTargetId = null;

/** @type {string} */
let AUTH_TOKEN = 'ag_default_token';

/** @type {import('ws').WebSocketServer | null} */
let websocketServer = null;
/** @type {(() => void) | null} */
let suggestionQueueUnsubscribe = null;
/** @type {(() => void) | null} */
let sessionStatsUnsubscribe = null;
/** @type {(() => void) | null} */
let quotaServiceUnsubscribe = null;
/** @type {(() => void) | null} */
let timelineUnsubscribe = null;
const TELEGRAM_CONFIGURED = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
);

const serverStartedAt = new Date().toISOString();
const MAX_SERVER_LOGS = 250;
/** @type {Array<{level: string, message: string, timestamp: string}>} */
const serverLogs = [];
const tunnelManagers = {
    cloudflare: new CloudflareTunnelManager(),
    pinggy: new PinggyTunnelManager()
};
let tunnelProvider = '';

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "worker-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
].join('; ');

/**
 * @param {string} [provider]
 */
function getTunnelManager(provider = tunnelProvider) {
    if (!provider) return null;
    return tunnelManagers[provider] || null;
}

/**
 * @param {string} [provider]
 */
function getTunnelStatus(provider = tunnelProvider) {
    const manager = getTunnelManager(provider);
    if (manager) {
        return manager.getStatus();
    }
    return {
        active: false,
        url: '',
        startedAt: '',
        error: '',
        logs: []
    };
}

function broadcastTunnelStatus() {
    broadcast({
        type: 'tunnel_status',
        status: {
            provider: tunnelProvider,
            ...getTunnelStatus()
        },
        timestamp: new Date().toISOString()
    });
}

/**
 * @param {string} provider
 * @returns {Promise<void>}
 */
async function stopOtherTunnels(provider) {
    const tasks = Object.entries(tunnelManagers)
        .filter(([name]) => name !== provider)
        .map(([, manager]) => manager.stop());
    await Promise.all(tasks);
}

/**
 * @param {string} provider
 * @param {number} port
 * @param {{tls?: boolean, sniServerName?: string}} [options]
 * @returns {Promise<string>}
 */
async function startTunnel(provider, port, options = {}) {
    const manager = getTunnelManager(provider);
    if (!manager) {
        throw new Error(`Unsupported tunnel provider: ${provider}`);
    }

    await stopOtherTunnels(provider);
    tunnelProvider = provider;
    return manager.start(port, options);
}

async function stopActiveTunnel() {
    const manager = getTunnelManager();
    if (!manager) return;
    await manager.stop();
}

const screenStreamState = {
    active: false,
    startedAt: '',
    lastFrameAt: '',
    /** @type {((params: any) => Promise<void>) | null} */
    listener: null
};

/**
 * @param {any} value
 * @returns {string}
 */
function serializeLogArg(value) {
    if (value instanceof Error) {
        return value.stack || value.message;
    }
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value);
    } catch (_) {
        return String(value);
    }
}

for (const level of /** @type {const} */ (['log', 'info', 'warn', 'error'])) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
        serverLogs.push({
            level,
            message: args.map(serializeLogArg).join(' '),
            timestamp: new Date().toISOString()
        });
        if (serverLogs.length > MAX_SERVER_LOGS) {
            serverLogs.shift();
        }
        original(...args);
    };
}

/**
 * @param {number} [limit]
 * @returns {Array<{level: string, message: string, timestamp: string}>}
 */
function getServerLogs(limit = 80) {
    return serverLogs.slice(-Math.max(1, limit));
}

/**
 * Track delivered Telegram notifications only when Telegram is configured.
 * `sendTelegramNotification()` returns true when disabled, so we gate metrics here.
 *
 * @param {boolean} sent
 */
function trackTelegramNotification(sent) {
    if (sent && TELEGRAM_CONFIGURED) {
        sessionStats.increment('telegramNotificationsSent');
    }
}

function getSuggestionState() {
    return {
        suggestMode: aiSupervisor.isSuggestModeEnabled(),
        pendingCount: suggestQueue.getPendingCount(),
        suggestions: suggestQueue.getAll()
    };
}

function broadcastSuggestionState() {
    broadcast({
        type: 'suggestion_state',
        ...getSuggestionState(),
        timestamp: new Date().toISOString()
    });
}

function getStatsState() {
    return {
        ...sessionStats.getSummary(),
        pendingSuggestions: suggestQueue.getPendingCount()
    };
}

function broadcastStatsState() {
    broadcast({
        type: 'stats_state',
        stats: getStatsState(),
        timestamp: new Date().toISOString()
    });
}

function getQuotaState() {
    return quotaService.getSummary();
}

function broadcastQuotaState() {
    broadcast({
        type: 'quota_state',
        quota: getQuotaState(),
        timestamp: new Date().toISOString()
    });
}

function getTimelineState() {
    return screenshotTimeline.getSummary();
}

function broadcastTimelineState() {
    broadcast({
        type: 'timeline_state',
        timeline: getTimelineState(),
        timestamp: new Date().toISOString()
    });
}

function getAssistContext() {
    return {
        stats: getStatsState(),
        quota: getQuotaState(),
        pendingSuggestions: suggestQueue.getPendingCount(),
        suggestions: suggestQueue.getPending().slice(0, 3)
    };
}

function getLatestPendingSuggestion() {
    return suggestQueue.getPending()[0] || null;
}

async function captureCurrentScreenshot({ format = 'jpeg', quality = 70 } = {}) {
    if (!cdpConnection) {
        return { success: false, error: 'CDP disconnected' };
    }

    try {
        /** @type {any} */
        const params = { format };
        if (format !== 'png') {
            params.quality = quality;
        }

        const result = await cdpConnection.call('Page.captureScreenshot', params);
        return {
            success: true,
            data: result.data,
            mimeType: format === 'png' ? 'image/png' : 'image/jpeg'
        };
    } catch (e) { const error = /** @type {Error} */ (e);
        return {
            success: false,
            error: error.message
        };
    }
}

/** @param {string} id */
async function approveQueuedSuggestion(id) {
    const suggestion = suggestQueue.find(id);
    if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
    }

    if (suggestion.status !== 'pending') {
        return { success: false, error: `Suggestion already ${suggestion.status}` };
    }

    if (!cdpConnection) {
        return { success: false, error: 'CDP disconnected' };
    }

    const executed = await completePendingAction(cdpConnection, suggestion.action);
    if (!executed.success) {
        return {
            success: false,
            error: executed.error || 'Failed to execute suggested action',
            executed
        };
    }

    const approved = suggestQueue.approve(id);
    if (suggestion.action === 'accept') {
        sessionStats.increment('actionsApproved');
    } else {
        sessionStats.increment('actionsRejected');
    }
    sessionStats.logAction('suggestion_executed', {
        id,
        action: suggestion.action
    });
    return {
        success: true,
        suggestion: approved,
        executed
    };
}

/** @param {string} id */
function rejectQueuedSuggestion(id) {
    const suggestion = suggestQueue.find(id);
    if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
    }

    if (suggestion.status !== 'pending') {
        return { success: false, error: `Suggestion already ${suggestion.status}` };
    }

    const rejected = suggestQueue.reject(id);
    sessionStats.logAction('suggestion_rejected_by_user', { id });
    return {
        success: true,
        suggestion: rejected
    };
}

/**
 * Broadcast a JSON payload to connected mobile clients.
 *
 * @param {object} payload
 * @returns {void}
 */
function broadcast(payload) {
    if (!websocketServer) return;
    const serialized = JSON.stringify(payload);
    websocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(serialized);
        }
    });
}

/**
 * @returns {number}
 */
function getOpenClientCount() {
    if (!websocketServer) return 0;
    let count = 0;
    websocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) count++;
    });
    return count;
}

// --- Model Running Status Indicator ---
let modelRunningState = false;
let modelStatusInterval = null;

async function getModelRunningState(cdp) {
    if (!cdp) return { running: false };
    try {
        const res = await cdp.call('Runtime.evaluate', {
            expression: `
                (() => {
                    const stopBtn = document.querySelector('button[aria-label="Cancel (Ctrl+D)"], button[data-tooltip-id="input-send-button-cancel-tooltip"]');
                    return stopBtn && stopBtn.offsetHeight > 0;
                })()
            `,
            returnByValue: true
        });
        return { running: !!res?.result?.value };
    } catch (e) {
        return { running: false };
    }
}

function startModelStatusPolling() {
    if (modelStatusInterval) return;
    modelStatusInterval = setInterval(async () => {
        if (getOpenClientCount() === 0) {
            clearInterval(modelStatusInterval);
            modelStatusInterval = null;
            return;
        }
        if (!cdpConnection) return;
        const current = await getModelRunningState(cdpConnection);
        if (current.running !== modelRunningState) {
            modelRunningState = current.running;
            broadcast({ type: 'model_status', running: modelRunningState });
        }
    }, 800);
}
// ----------------------------------------

/**
 * @returns {{active: boolean, startedAt: string, lastFrameAt: string}}
 */
function getScreencastStatus() {
    return {
        active: screenStreamState.active,
        startedAt: screenStreamState.startedAt,
        lastFrameAt: screenStreamState.lastFrameAt
    };
}

/**
 * @returns {Promise<void>}
 */
async function stopScreencast() {
    const wasActive = screenStreamState.active;
    if (cdpConnection && screenStreamState.active) {
        try {
            if (screenStreamState.listener) {
                cdpConnection.off('Page.screencastFrame', screenStreamState.listener);
            }
            await cdpConnection.call('Page.stopScreencast', {});
        } catch (_) {
            // Ignore stop errors during reconnect or target switches.
        }
    }

    screenStreamState.active = false;
    screenStreamState.startedAt = '';
    screenStreamState.lastFrameAt = '';
    screenStreamState.listener = null;
    if (wasActive) {
        sessionStats.increment('screenStreamsStopped');
        sessionStats.logAction('screencast_stopped');
    }
    broadcast({ type: 'screen_status', status: getScreencastStatus() });
}

/**
 * @returns {Promise<{active: boolean, startedAt: string, lastFrameAt: string}>}
 */
async function startScreencast() {
    if (!cdpConnection) {
        throw new Error('CDP disconnected');
    }

    if (screenStreamState.active) {
        return getScreencastStatus();
    }

    await cdpConnection.call('Page.enable', {});

    screenStreamState.listener = async (params) => {
        screenStreamState.lastFrameAt = new Date().toISOString();
        broadcast({
            type: 'screen_frame',
            data: params.data,
            format: 'image/jpeg',
            timestamp: screenStreamState.lastFrameAt
        });
        try {
            await cdpConnection?.call('Page.screencastFrameAck', { sessionId: params.sessionId });
        } catch (_) {
            // Ignore acknowledgements during reconnect.
        }
    };

    cdpConnection.on('Page.screencastFrame', screenStreamState.listener);
    await cdpConnection.call('Page.startScreencast', {
        format: 'jpeg',
        quality: 60,
        maxWidth: 1280,
        maxHeight: 900,
        everyNthFrame: 1
    });

    screenStreamState.active = true;
    screenStreamState.startedAt = new Date().toISOString();
    screenStreamState.lastFrameAt = '';
    sessionStats.increment('screenStreamsStarted');
    sessionStats.logAction('screencast_started');
    broadcast({ type: 'screen_status', status: getScreencastStatus() });
    return getScreencastStatus();
}

/**
 * @returns {Promise<void>}
 */
async function maybeStartAutoTunnel(options = {}) {
    const provider = AUTO_TUNNEL_PROVIDER;
    const manager = getTunnelManager(provider);
    if (!manager) return;
    if (manager.getStatus().active) return;

    try {
        const url = await startTunnel(provider, Number(SERVER_PORT), options);
        console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ${provider} tunnel ready: ${url}`);
    } catch (e) { const error = /** @type {Error} */ (e);
        console.warn(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ${provider} tunnel failed: ${error.message}`);
    }
}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ CDP Action Functions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
// These functions contain large template-literal scripts injected into
// the browser via CDP Runtime.evaluate. They stay in this file because
// the template strings reference interpolated variables from their
// closure scope, making extraction fragile.

// (connectCDP moved to src/cdp/connection.js)

/**
 * Capture the current chat DOM as an HTML snapshot with CSS styles.
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<import('./state.js').Snapshot | null>}
 */
/**
 * Scan all CDP contexts for full-page error/modal dialogs that exist OUTSIDE
 * the main chat container (e.g. quota reached, agent terminated, rate limit).
 * Inspired by tody-agent/AntigravityMobile chat-stream.mjs:checkErrorDialogs.
 *
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{error: string, type: string} | null>}
 */
async function checkErrorDialogs(cdp) {
    const DIALOG_SCRIPT = `(function() {
        try {
            const dialogs = document.querySelectorAll(
                '[role="dialog"], .dialog-shadow, .monaco-dialog-box, ' +
                '[class*="dialog"], [class*="notification-toast"], ' +
                '[class*="error-widget"], .notifications-toasts'
            );
            for (const d of dialogs) {
                if (d.offsetParent === null && !d.closest('[class*="toast"]')) continue;
                const text = (d.innerText || '').toLowerCase();
                const len = text.length;
                if (len < 5 || len > 2000) continue;

                if (text.includes('terminated due to error') || text.includes('agent terminated')) {
                    return { error: 'Agent terminated due to error', type: 'terminated' };
                }
                if (text.includes('model quota reached') || text.includes('quota exhausted') || text.includes('usage limit')) {
                    return { error: 'Model quota reached', type: 'quota' };
                }
                if (text.includes('rate limit') || text.includes('too many requests') || text.includes('rate_limit_error')) {
                    return { error: 'Rate limit exceeded', type: 'rate_limit' };
                }
                if (text.includes('high traffic') || text.includes('overloaded')) {
                    return { error: 'High traffic / server overloaded', type: 'high_traffic' };
                }
                if (text.includes('internal server error') || text.includes('something went wrong')) {
                    return { error: 'Internal server error', type: 'server_error' };
                }
                if (text.includes('network error') || text.includes('connection lost')) {
                    return { error: 'Network error / connection lost', type: 'network_error' };
                }
            }
            return null;
        } catch(e) { return null; }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: DIALOG_SCRIPT,
                returnByValue: true,
                contextId: ctx.id
            });
            if (res.result?.value) return res.result.value;
        } catch (e) { /* context may be gone */ }
    }
    return null;
}

let hasLoadedFullHistory = false;
let isLoadingHistory = false;

async function loadFullHistory(cdp) {
    if (hasLoadedFullHistory || isLoadingHistory) return;
    isLoadingHistory = true;
    console.log('⏳ Starting programmatic history sweep to capture full conversation...');
    
    const LOAD_HISTORY_SCRIPT = `(async () => {
        const cascade = document.getElementById('cascade') || document.getElementById('conversation') || document.getElementById('chat');
        if (!cascade) return { error: 'chat container not found' };
        
        const scrollContainer = cascade.querySelector('.overflow-y-auto, [data-scroll-area]') || cascade;
        
        const origScrollTop = scrollContainer.scrollTop;
        const origScrollHeight = scrollContainer.scrollHeight;
        
        const getMsgCount = () => Array.from(cascade.querySelectorAll('.message, [class*="chat-message"], [class*="message-block"], [class*="chat-item"]')).length;
        
        let prevHeight = scrollContainer.scrollHeight;
        let prevCount = getMsgCount();
        let iterations = 0;
        
        let minDomOrder = 0;
        if (!window.__omniHistoryCache) window.__omniHistoryCache = new Map();
        
        function updateCache() {
            const msgs = Array.from(cascade.querySelectorAll('.message, [class*="chat-message"], [class*="message-block"], [class*="chat-item"]'));
            msgs.forEach((m, idx) => {
                let id = m.getAttribute('data-id') || m.id;
                if (!id) {
                    const text = m.innerText || m.textContent || '';
                    const hash = Array.from(text).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
                    id = 'msg-' + hash;
                    m.setAttribute('data-omni-msg-id', id);
                }
                
                if (!window.__omniHistoryCache.has(id)) {
                    window.__omniHistoryCache.set(id, {
                        id: id,
                        html: m.outerHTML,
                        // If sweeping up, these messages are older, so they get smaller domOrder
                        domOrder: minDomOrder + idx,
                        timestamp: Date.now()
                    });
                }
            });
            // Update minDomOrder for the next sweep up
            minDomOrder -= msgs.length;
        }
        
        updateCache();
        
        scrollContainer.scrollTop = 0;
        await new Promise(r => setTimeout(r, 1000));
        
        while (iterations < 25) {
            updateCache();
            
            if (scrollContainer.scrollHeight === prevHeight && getMsgCount() === prevCount) {
                await new Promise(r => setTimeout(r, 1500));
                if (scrollContainer.scrollHeight === prevHeight && getMsgCount() === prevCount) {
                    break;
                }
            }
            
            prevHeight = scrollContainer.scrollHeight;
            prevCount = getMsgCount();
            scrollContainer.scrollTop = 0;
            await new Promise(r => setTimeout(r, 800));
            iterations++;
        }
        
        updateCache();
        
        const distFromBottom = origScrollHeight - origScrollTop;
        scrollContainer.scrollTop = scrollContainer.scrollHeight - distFromBottom;
        
        return { success: true, iterations, finalCount: window.__omniHistoryCache.size, newHeight: scrollContainer.scrollHeight };
    })();`;
    
    try {
        let success = false;
        let finalIterations = 0;
        let finalCount = 0;
        
        for (const ctx of cdp.contexts) {
            const res = await cdp.call('Runtime.evaluate', {
                expression: LOAD_HISTORY_SCRIPT,
                awaitPromise: true,
                returnByValue: true,
                contextId: ctx.id
            });
            
            if (res.result?.value?.success) {
                success = true;
                finalIterations = res.result.value.iterations;
                finalCount = res.result.value.finalCount;
                break;
            }
        }
        
        if (success) {
            console.log(`✅ History sweep complete. Iterations: ${finalIterations}, Total Messages Cached: ${finalCount}`);
            hasLoadedFullHistory = true;
        } else {
            console.log('⚠️ History sweep could not find chat container in any context.');
        }
    } catch (e) {
        console.warn('History sweep failed:', e);
    } finally {
        isLoadingHistory = false;
    }
}

async function captureSnapshot(cdp) {
    const CAPTURE_SCRIPT = `(() => {
        const INTERACTIVE_TEXT_PATTERNS = [
            /^thought/i,
            /^thinking/i,
            /^run$/i,
            /^reject$/i,
            /^accept$/i,
            /^allow$/i,
            /^deny$/i,
            /^review changes$/i,
            /^files with changes$/i,
            /^continue$/i,
            /^cancel$/i,
            /^retry$/i,
            /^show more$/i,
            /^show less$/i,
            /^expand$/i,
            /^collapse$/i,
            /^copy$/i
        ];
        const normalizeText = (value) => (value || '').split('\\n')[0].replace(/\\s+/g, ' ').trim();
        const isInteractiveCandidate = (el) => {
            const text = normalizeText(el.textContent || el.innerText || '');
            if (!text || text.length > 120) return false;
            if (el.children.length > 0) return false;
            if (['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)) return true;
            if (el.getAttribute('role') === 'button') return true;
            return INTERACTIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text));
        };

        // Smart container detection: try multiple IDs with fallback chain
        const CONTAINER_IDS = ['cascade', 'conversation', 'chat'];
        let cascade = null;
        for (const id of CONTAINER_IDS) {
            cascade = document.getElementById(id);
            if (cascade) break;
        }
        if (!cascade) {
            // Debug info
            const body = document.body;
            const childIds = Array.from(body.children).map(c => c.id).filter(id => id).join(', ');
            return { error: 'chat container not found', debug: { hasBody: !!body, availableIds: childIds } };
        }
        
        const cascadeStyles = window.getComputedStyle(cascade);
        
        // Find the main scrollable container
        const scrollContainer = cascade.querySelector('.overflow-y-auto, [data-scroll-area]') || cascade;
        const scrollInfo = {
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            scrollPercent: scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight) || 0
        };
        
        // Clone cascade to modify it without affecting the original
        const clone = cascade.cloneNode(true);
        const wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        
        // Append floating dialogs/modals that are outside the cascade
        try {
            const dialogs = document.querySelectorAll(
                '[role="dialog"], .dialog-shadow, .monaco-dialog-box, ' +
                '[class*="dialog"], [class*="notification-toast"], ' +
                '[class*="error-widget"], .notifications-toasts, ' +
                '.monaco-menu-container, [class*="context-view"]'
            );
            
            const addedDialogs = new Set();
            dialogs.forEach(d => {
                if (cascade.contains(d)) return;
                if (d.offsetParent === null && !d.closest('[class*="toast"]')) return;
                if (addedDialogs.has(d) || Array.from(addedDialogs).some(parent => parent.contains(d))) return;
                
                const dClone = d.cloneNode(true);
                dClone.style.position = 'fixed';
                dClone.style.zIndex = '9999';
                wrapper.appendChild(dClone);
                addedDialogs.add(d);
            });
        } catch (e) {}
        
        // Aggressively remove the entire interaction/input/review area
        try {
            // 1. Identify common interaction wrappers by class combinations
            const interactionSelectors = [
                '.relative.flex.flex-col.gap-8',
                '.flex.grow.flex-col.justify-start.gap-8',
                'div[class*="interaction-area"]',
                '.p-1.bg-gray-500\\/10',
                '.outline-solid.justify-between',
                '[contenteditable="true"]'
            ];

            interactionSelectors.forEach(selector => {
                wrapper.querySelectorAll(selector).forEach(el => {
                    try {
                        // For the editor, we want to remove its interaction container
                        if (selector === '[contenteditable="true"]') {
                            const area = el.closest('.relative.flex.flex-col.gap-8') || 
                                         el.closest('.flex.grow.flex-col.justify-start.gap-8') ||
                                         el.closest('div[id^="interaction"]') ||
                                         el.parentElement?.parentElement;
                            if (area && area !== wrapper && area !== clone) area.remove();
                            else el.remove();
                        } else {
                            el.remove();
                        }
                    } catch(e) {}
                });
            });

            // 2. Text-based cleanup for stray status bars
            const allElements = wrapper.querySelectorAll('*');
            allElements.forEach(el => {
                try {
                    const text = (el.innerText || '').toLowerCase();
                    if (text.includes('review changes') || text.includes('files with changes') || text.includes('context found')) {
                        if (el.children.length < 10 || el.querySelector('button') || el.classList?.contains('justify-between')) {
                            el.style.display = 'none';
                            el.remove();
                        }
                    }
                } catch (e) {}
            });

            // 3. Base64 image conversion ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â convert local SVGs/images to data URIs
            //    This prevents broken images when accessing via ngrok/remote
            wrapper.querySelectorAll('img[src], svg').forEach(el => {
                try {
                    if (el.tagName === 'SVG') {
                        const svgData = new XMLSerializer().serializeToString(el);
                        const img = document.createElement('img');
                        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        img.style.cssText = el.style.cssText || '';
                        img.width = el.getAttribute('width') || el.clientWidth || 16;
                        img.height = el.getAttribute('height') || el.clientHeight || 16;
                        img.className = el.className?.baseVal || '';
                        el.replaceWith(img);
                    } else if (el.src && !el.src.startsWith('data:') && !el.src.startsWith('http')) {
                        // Local file references ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â try canvas conversion
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = el.naturalWidth || el.width || 16;
                            canvas.height = el.naturalHeight || el.height || 16;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(el, 0, 0);
                            el.src = canvas.toDataURL('image/png');
                        } catch(canvasErr) {}
                    }
                } catch(imgErr) {}
            });

            const textGroups = new Map();
            Array.from(wrapper.querySelectorAll('button, [role="button"], a, summary, span, div, p')).forEach(el => {
                try {
                    if (!isInteractiveCandidate(el)) return;
                    const text = normalizeText(el.textContent || el.innerText || '');
                    if (!textGroups.has(text)) {
                        textGroups.set(text, []);
                    }
                    textGroups.get(text).push(el);
                } catch (_) {}
            });

            textGroups.forEach((elements, text) => {
                elements.forEach((el, idx) => {
                    el.setAttribute('data-omni-text', text);
                    el.setAttribute('data-omni-idx', String(idx));
                    el.setAttribute('data-omni-total', String(elements.length));
                });
            });
        } catch (globalErr) { }
        
        // --- Merge into full history cache ---
        if (window.__omniHistoryCache) {
            const currentMsgs = Array.from(wrapper.querySelectorAll('.message, [class*="chat-message"], [class*="message-block"], [class*="chat-item"]'));
            currentMsgs.forEach((m, idx) => {
                let id = m.getAttribute('data-omni-msg-id') || m.getAttribute('data-id') || m.id;
                if (!id) {
                    const hash = Array.from(m.innerText || m.textContent || '').reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
                    id = 'msg-' + hash;
                    m.setAttribute('data-omni-msg-id', id);
                }
                if (!window.__omniHistoryCache.has(id)) {
                    window.__omniHistoryCache.set(id, {
                        id: id,
                        html: m.outerHTML,
                        domOrder: window.__omniHistoryCache.size,
                        timestamp: Date.now()
                    });
                } else {
                    const existing = window.__omniHistoryCache.get(id);
                    existing.html = m.outerHTML;
                    existing.timestamp = Date.now();
                }
            });
            
            const scrollContainer = wrapper.querySelector('.overflow-y-auto, [data-scroll-area]') || wrapper;
            const msgsInWrapper = Array.from(scrollContainer.querySelectorAll('.message, [class*="chat-message"], [class*="message-block"], [class*="chat-item"]'));
            if (msgsInWrapper.length > 0) {
                const parent = msgsInWrapper[0].parentElement;
                if (parent) {
                    msgsInWrapper.forEach(m => m.remove());
                    const sortedMsgs = Array.from(window.__omniHistoryCache.values()).sort((a, b) => a.domOrder - b.domOrder);
                    sortedMsgs.forEach(m => {
                        const template = document.createElement('template');
                        template.innerHTML = m.html.trim();
                        if (template.content.firstChild) {
                            parent.appendChild(template.content.firstChild);
                        }
                    });
                }
            }
        }
        
        const html = wrapper.innerHTML;
        
        const rules = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    rules.push(rule.cssText);
                }
            } catch (e) { }
        }
        const allCSS = rules.join('\\n');
        
        return {
            html: html,
            css: allCSS,
            backgroundColor: cascadeStyles.backgroundColor,
            color: cascadeStyles.color,
            fontFamily: cascadeStyles.fontFamily,
            scrollInfo: scrollInfo,
            stats: {
                nodes: clone.getElementsByTagName('*').length,
                htmlSize: html.length,
                cssSize: allCSS.length
            }
        };
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            // console.log(`Trying context ${ctx.id} (${ctx.name || ctx.origin})...`);
            const result = await cdp.call("Runtime.evaluate", {
                expression: CAPTURE_SCRIPT,
                returnByValue: true,
                contextId: ctx.id
            });

            if (result.exceptionDetails) {
                // console.log(`Context ${ctx.id} exception:`, result.exceptionDetails);
                continue;
            }

            if (result.result && result.result.value) {
                const val = result.result.value;
                if (val.error) {
                    // console.log(`Context ${ctx.id} script error:`, val.error);
                    // if (val.debug) console.log(`   Debug info:`, JSON.stringify(val.debug));
                } else {
                    return val;
                }
            }
        } catch (e) {
            console.log(`Context ${ctx.id} connection error:`, e.message);
        }
    }

    return null;
}

/**
 * Inject a message into the Antigravity chat editor and submit it.
 * @param {import('./state.js').CDPConnection} cdp
 * @param {string} text
 * @returns {Promise<{ok: boolean, method?: string, reason?: string, error?: string}>}
 */
async function injectMessage(cdp, text) {
    // Use JSON.stringify for robust escaping (handles ", \, newlines, backticks, unicode, etc.)
    const safeText = JSON.stringify(text);

    const EXPRESSION = `(async () => {
        const cancel = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancel && cancel.offsetParent !== null) return { ok:false, reason:"busy" };

        const editors = [...document.querySelectorAll('#conversation [contenteditable="true"], #chat [contenteditable="true"], #cascade [contenteditable="true"]')]
            .filter(el => el.offsetParent !== null);
        const editor = editors.at(-1);
        if (!editor) return { ok:false, error:"editor_not_found" };

        const textToInsert = ${safeText};

        editor.focus();
        document.execCommand?.("selectAll", false, null);
        document.execCommand?.("delete", false, null);

        let inserted = false;
        try { inserted = !!document.execCommand?.("insertText", false, textToInsert); } catch {}
        if (!inserted) {
            editor.textContent = textToInsert;
            editor.dispatchEvent(new InputEvent("beforeinput", { bubbles:true, inputType:"insertText", data: textToInsert }));
            editor.dispatchEvent(new InputEvent("input", { bubbles:true, inputType:"insertText", data: textToInsert }));
        }

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const submit = document.querySelector("svg.lucide-arrow-right")?.closest("button");
        if (submit && !submit.disabled) {
            submit.click();
            return { ok:true, method:"click_submit" };
        }

        // Submit button not found, but text is inserted - trigger Enter key
        editor.dispatchEvent(new KeyboardEvent("keydown", { bubbles:true, key:"Enter", code:"Enter" }));
        editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles:true, key:"Enter", code:"Enter" }));
        
        return { ok:true, method:"enter_keypress" };
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const result = await cdp.call("Runtime.evaluate", {
                expression: EXPRESSION,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });

            if (result.result && result.result.value) {
                return result.result.value;
            }
        } catch (e) { }
    }

    return { ok: false, reason: "no_context" };
}

/**
 * Set the functionality mode (Fast vs Planning).
 * @param {import('./state.js').CDPConnection} cdp
 * @param {'Fast' | 'Planning'} mode
 * @returns {Promise<{success?: boolean, alreadySet?: boolean, error?: string}>}
 */
async function setMode(cdp, mode) {
    if (!['Fast', 'Planning'].includes(mode)) return { error: 'Invalid mode' };

    const EXP = `(async () => {
        try {
            // STRATEGY: Find the element that IS the current mode indicator.
            // It will have text 'Fast' or 'Planning'.
            // It might not be a <button>, could be a <div> with cursor-pointer.
            
            // 1. Get all elements with text 'Fast' or 'Planning'
            const allEls = Array.from(document.querySelectorAll('*'));
            const candidates = allEls.filter(el => {
                // Must have single text node child to avoid parents
                if (el.children.length > 0) return false;
                const txt = el.textContent.trim();
                return txt === 'Fast' || txt === 'Planning';
            });

            // 2. Find the one that looks interactive (cursor-pointer)
            // Traverse up from text node to find clickable container
            let modeBtn = null;
            
            for (const el of candidates) {
                let current = el;
                // Go up max 4 levels
                for (let i = 0; i < 4; i++) {
                    if (!current) break;
                    const style = window.getComputedStyle(current);
                    if (style.cursor === 'pointer' || current.tagName === 'BUTTON') {
                        modeBtn = current;
                        break;
                    }
                    current = current.parentElement;
                }
                if (modeBtn) break;
            }

            if (!modeBtn) return { error: 'Mode indicator/button not found' };

            // Check if already set
            if (modeBtn.innerText.includes('${mode}')) return { success: true, alreadySet: true };

            // 3. Click to open menu
            modeBtn.click();
            await new Promise(r => setTimeout(r, 600));

            // 4. Find the dialog
            let visibleDialog = Array.from(document.querySelectorAll('[role="dialog"]'))
                                    .find(d => d.offsetHeight > 0 && d.innerText.includes('${mode}'));
            
            // Fallback: Just look for any new visible container if role=dialog is missing
            if (!visibleDialog) {
                // Maybe it's not role=dialog? Look for a popover-like div
                 visibleDialog = Array.from(document.querySelectorAll('div'))
                    .find(d => {
                        const style = window.getComputedStyle(d);
                        return d.offsetHeight > 0 && 
                               (style.position === 'absolute' || style.position === 'fixed') && 
                               d.innerText.includes('${mode}') &&
                               !d.innerText.includes('Files With Changes'); // Anti-context menu
                    });
            }

            if (!visibleDialog) return { error: 'Dropdown not opened or options not visible' };

            // 5. Click the option
            const allDialogEls = Array.from(visibleDialog.querySelectorAll('*'));
            const target = allDialogEls.find(el => 
                el.children.length === 0 && el.textContent.trim() === '${mode}'
            );

            if (target) {
                target.click();
                await new Promise(r => setTimeout(r, 200));
                return { success: true };
            }
            
            return { error: 'Mode option text not found in dialog. Dialog text: ' + visibleDialog.innerText.substring(0, 50) };

        } catch(err) {
            return { error: 'JS Error: ' + err.toString() };
        }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Context failed' };
}

/**
 * Stop the current AI generation.
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{success?: boolean, method?: string, error?: string}>}
 */
async function stopGeneration(cdp) {
    const EXP = `(async () => {
        // Look for the cancel button
        const cancel = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancel && cancel.offsetParent !== null) {
            cancel.click();
            return { success: true };
        }
        
        // Fallback: Look for a square icon in the send button area
        const stopBtn = document.querySelector('button svg.lucide-square')?.closest('button');
        if (stopBtn && stopBtn.offsetParent !== null) {
            stopBtn.click();
            return { success: true, method: 'fallback_square' };
        }

        return { error: 'No active generation found to stop' };
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Context failed' };
}

/**
 * Click a DOM element via deterministic targeting with occurrence index.
 * @param {import('./state.js').CDPConnection} cdp
 * @param {{selector?: string, index?: number, textContent?: string, omniIndex?: number}} params
 * @returns {Promise<{success?: boolean, matchCount?: number, index?: number, omniIndex?: number, error?: string}>}
 */
async function clickElement(cdp, { selector, index = 0, textContent, omniIndex }) {
    const safeSelector = JSON.stringify(selector || '*');
    const safeTextContent = textContent ? JSON.stringify(textContent) : 'null';
    const safeIndex = Number.isFinite(index) ? index : 0;
    const safeOmniIndex = Number.isFinite(omniIndex) ? omniIndex : -1;
    const EXP = `(async () => {
        try {
            const selector = ${safeSelector};
            const searchText = ${safeTextContent};
            const explicitIndex = ${safeIndex};
            const omniIndex = ${safeOmniIndex};
            const normalizeText = (value) => (value || '').split('\\n')[0].replace(/\\s+/g, ' ').trim();
            const isVisible = (el) => !!(el && (el.offsetParent !== null || el.getClientRects().length > 0));
            const matchesSearchText = (el) => {
                if (!searchText) return true;
                const exact = normalizeText(el.textContent || el.innerText || '');
                if (exact === searchText) return true;
                const fullText = (el.textContent || el.innerText || '').trim();
                return fullText.includes(searchText);
            };
            const isClickable = (el) => {
                if (!el) return false;
                if (['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)) return true;
                if (el.getAttribute('role') === 'button') return true;
                if (typeof el.onclick === 'function') return true;
                const style = window.getComputedStyle(el);
                return style.cursor === 'pointer';
            };
            const findClickableTarget = (el) => {
                let current = el;
                for (let i = 0; current && i < 6; i += 1) {
                    if (isClickable(current)) return current;
                    current = current.parentElement;
                }
                return el;
            };
            
            const CONTAINER_IDS = ['cascade', 'conversation', 'chat'];
            let scope = null;
            for (const id of CONTAINER_IDS) {
                scope = document.getElementById(id);
                if (scope) break;
            }
            if (!scope) scope = document.body;
            
            let elements = [];
            try {
                elements = Array.from(scope.querySelectorAll(selector));
            } catch (_) {
                elements = Array.from(scope.querySelectorAll('*'));
            }
            elements = elements.filter(isVisible);
            
            if (searchText) {
                elements = elements.filter(matchesSearchText);
            }

            if (elements.length === 0 && searchText) {
                elements = Array.from(
                    scope.querySelectorAll('button, [role="button"], a, summary, span, div, p')
                )
                    .filter(isVisible)
                    .filter(matchesSearchText);
            }
            
            if (elements.length > 1) {
                elements = elements.filter(el => {
                    return !elements.some(other => other !== el && el.contains(other));
                });
            }

            const targetIndex = omniIndex >= 0 ? omniIndex : explicitIndex;
            const target = elements[targetIndex];

            if (target) {
                const clickable = findClickableTarget(target);
                clickable.click();

                try {
                    const rect = clickable.getBoundingClientRect();
                    const clientX = rect.left + rect.width / 2;
                    const clientY = rect.top + rect.height / 2;
                    ['mousedown', 'mouseup', 'click'].forEach(type => {
                        clickable.dispatchEvent(new MouseEvent(type, {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX,
                            clientY,
                            button: 0
                        }));
                    });
                } catch (_) {}

                return {
                    success: true,
                    matchCount: elements.length,
                    index: explicitIndex,
                    omniIndex: targetIndex
                };
            }
            
            return { error: 'Element not found at requested index', candidates: elements.length, omniIndex: targetIndex };
        } catch(e) {
            return { error: e.toString() };
        }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value?.success) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Click failed in all contexts' };
}

/**
 * Sync phone scroll position to the desktop chat container.
 * @param {import('./state.js').CDPConnection} cdp
 * @param {{scrollTop?: number, scrollPercent?: number}} params
 * @returns {Promise<{success?: boolean, scrolled?: number, error?: string}>}
 */
async function remoteScroll(cdp, { scrollTop, scrollPercent }) {
    // Try to scroll the chat container in Antigravity
    const EXPRESSION = `(async () => {
        try {
            // Find the main scrollable chat container
            const scrollables = [...document.querySelectorAll('#conversation [class*="scroll"], #chat [class*="scroll"], #cascade [class*="scroll"], #conversation [style*="overflow"], #chat [style*="overflow"], #cascade [style*="overflow"]')]
                .filter(el => el.scrollHeight > el.clientHeight);
            
            // Also check for the main chat area
            const chatArea = document.querySelector('#conversation .overflow-y-auto, #chat .overflow-y-auto, #cascade .overflow-y-auto, #conversation [data-scroll-area], #chat [data-scroll-area], #cascade [data-scroll-area]');
            if (chatArea) scrollables.unshift(chatArea);
            
            if (scrollables.length === 0) {
                // Fallback: scroll the main container element
                const cascade = document.getElementById('conversation') || document.getElementById('chat') || document.getElementById('cascade');
                if (cascade && cascade.scrollHeight > cascade.clientHeight) {
                    scrollables.push(cascade);
                }
            }
            
            if (scrollables.length === 0) return { error: 'No scrollable element found' };
            
            const target = scrollables[0];
            
            // Use percentage-based scrolling for better sync
            if (${scrollPercent} !== undefined) {
                const maxScroll = target.scrollHeight - target.clientHeight;
                target.scrollTop = maxScroll * ${scrollPercent};
            } else {
                target.scrollTop = ${scrollTop || 0};
            }
            
            return { success: true, scrolled: target.scrollTop };
        } catch(e) {
            return { error: e.toString() };
        }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXPRESSION,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value?.success) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Scroll failed in all contexts' };
}

/**
 * Set the AI model via the model selector dropdown.
 * @param {import('./state.js').CDPConnection} cdp
 * @param {string} modelName
 * @returns {Promise<{success?: boolean, method?: string, error?: string}>}
 */
async function setModel(cdp, modelName) {
    const EXP = `(async () => {
        try {
            // STRATEGY: Multi-layered approach to find and click the model selector
            const KNOWN_KEYWORDS = ["Gemini", "Claude", "GPT", "Model"];
            
            let modelBtn = null;
            
            // Strategy 1: Look for data-tooltip-id patterns (most reliable)
            modelBtn = document.querySelector('[data-tooltip-id*="model"], [data-tooltip-id*="provider"]');
            
            // Strategy 2: Look for buttons/elements containing model keywords with SVG icons
            if (!modelBtn) {
                const candidates = Array.from(document.querySelectorAll('button, [role="button"], div, span'))
                    .filter(el => {
                        const txt = el.innerText?.trim() || '';
                        return KNOWN_KEYWORDS.some(k => txt.includes(k)) && el.offsetParent !== null;
                    });

                // Find the best one (has chevron icon or cursor pointer)
                modelBtn = candidates.find(el => {
                    const style = window.getComputedStyle(el);
                    const hasSvg = el.querySelector('svg.lucide-chevron-up') || 
                                   el.querySelector('svg.lucide-chevron-down') || 
                                   el.querySelector('svg[class*="chevron"]') ||
                                   el.querySelector('svg');
                    return (style.cursor === 'pointer' || el.tagName === 'BUTTON') && hasSvg;
                }) || candidates[0];
            }
            
            // Strategy 3: Traverse from text nodes up to clickable parents
            if (!modelBtn) {
                const allEls = Array.from(document.querySelectorAll('*'));
                const textNodes = allEls.filter(el => {
                    if (el.children.length > 0) return false;
                    const txt = el.textContent;
                    return KNOWN_KEYWORDS.some(k => txt.includes(k));
                });

                for (const el of textNodes) {
                    let current = el;
                    for (let i = 0; i < 5; i++) {
                        if (!current) break;
                        if (current.tagName === 'BUTTON' || window.getComputedStyle(current).cursor === 'pointer') {
                            modelBtn = current;
                            break;
                        }
                        current = current.parentElement;
                    }
                    if (modelBtn) break;
                }
            }

            if (!modelBtn) return { error: 'Model selector button not found' };

            // Click to open menu
            modelBtn.click();
            await new Promise(r => setTimeout(r, 600));

            // Find the dialog/dropdown - search globally (React portals render at body level)
            let visibleDialog = null;
            
            // Try specific dialog patterns first
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'));
            visibleDialog = dialogs.find(d => d.offsetHeight > 0 && d.innerText?.includes('${modelName}'));
            
            // Fallback: look for positioned divs
            if (!visibleDialog) {
                visibleDialog = Array.from(document.querySelectorAll('div'))
                    .find(d => {
                        const style = window.getComputedStyle(d);
                        return d.offsetHeight > 0 && 
                               (style.position === 'absolute' || style.position === 'fixed') && 
                               d.innerText?.includes('${modelName}') && 
                               !d.innerText?.includes('Files With Changes');
                    });
            }

            if (!visibleDialog) {
                // Blind search across entire document as last resort
                const allElements = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"]'));
                const target = allElements.find(el => 
                    el.offsetParent !== null && 
                    (el.innerText?.trim() === '${modelName}' || el.innerText?.includes('${modelName}'))
                );
                if (target) {
                    target.click();
                    return { success: true, method: 'blind_search' };
                }
                return { error: 'Model list not opened' };
            }

            // Select specific model inside the dialog
            const allDialogEls = Array.from(visibleDialog.querySelectorAll('*'));
            const validEls = allDialogEls.filter(el => el.children.length === 0 && el.textContent?.trim().length > 0);
            
            // A. Exact Match (Best)
            let target = validEls.find(el => el.textContent.trim() === '${modelName}');
            
            // B. Page contains Model
            if (!target) {
                target = validEls.find(el => el.textContent.includes('${modelName}'));
            }

            // C. Closest partial match
            if (!target) {
                const partialMatches = validEls.filter(el => '${modelName}'.includes(el.textContent.trim()));
                if (partialMatches.length > 0) {
                    partialMatches.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length);
                    target = partialMatches[0];
                }
            }

            if (target) {
                target.scrollIntoView({block: 'center'});
                target.click();
                await new Promise(r => setTimeout(r, 200));
                return { success: true };
            }

            return { error: 'Model "${modelName}" not found in list. Visible: ' + visibleDialog.innerText.substring(0, 100) };
        } catch(err) {
            return { error: 'JS Error: ' + err.toString() };
        }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Context failed' };
}

/**
 * Start a new chat by clicking the + button at the top toolbar.
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{success?: boolean, method?: string, count?: number, error?: string}>}
 */
async function startNewChat(cdp) {
    const EXP = `(async () => {
        try {
            // Priority 1: Exact selector from user (data-tooltip-id="new-conversation-tooltip")
            const exactBtn = document.querySelector('[data-tooltip-id="new-conversation-tooltip"]');
            if (exactBtn) {
                exactBtn.click();
                return { success: true, method: 'data-tooltip-id' };
            }

            // Fallback: Use previous heuristics
            const allButtons = Array.from(document.querySelectorAll('button, [role="button"], a'));
            
            // Find all buttons with plus icons
            const plusButtons = allButtons.filter(btn => {
                if (btn.offsetParent === null) return false; // Skip hidden
                const hasPlusIcon = btn.querySelector('svg.lucide-plus') || 
                                   btn.querySelector('svg.lucide-square-plus') ||
                                   btn.querySelector('svg[class*="plus"]');
                return hasPlusIcon;
            });
            
            // Filter only top buttons (toolbar area)
            const topPlusButtons = plusButtons.filter(btn => {
                const rect = btn.getBoundingClientRect();
                return rect.top < 200;
            });

            if (topPlusButtons.length > 0) {
                 topPlusButtons.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                 topPlusButtons[0].click();
                 return { success: true, method: 'filtered_top_plus', count: topPlusButtons.length };
            }
            
            // Fallback: aria-label
             const newChatBtn = allButtons.find(btn => {
                const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                const title = btn.getAttribute('title')?.toLowerCase() || '';
                return (ariaLabel.includes('new') || title.includes('new')) && btn.offsetParent !== null;
            });
            
            if (newChatBtn) {
                newChatBtn.click();
                return { success: true, method: 'aria_label_new' };
            }
            
            return { error: 'New chat button not found' };
        } catch(e) {
            return { error: e.toString() };
        }
    })()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value?.success) return res.result.value;
        } catch (e) { }
    }
    return { error: 'Context failed' };
}
/**
 * Click the history button and scrape the conversation list.
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{success?: boolean, chats: Array<{title: string, date: string}>, debug?: object, error?: string}>}
 */
async function getChatHistory(cdp) {
    const EXP = `(async () => {
        try {
            const chats = [];
            const seenTitles = new Set();

            // Priority 1: Look for tooltip ID pattern (history/past/recent)
            let historyBtn = document.querySelector('[data-tooltip-id*="history"], [data-tooltip-id*="past"], [data-tooltip-id*="recent"], [data-tooltip-id*="conversation-history"]');
            
            // Priority 2: Look for button ADJACENT to the new chat button
            if (!historyBtn) {
                const newChatBtn = document.querySelector('[data-tooltip-id="new-conversation-tooltip"]');
                if (newChatBtn) {
                    const parent = newChatBtn.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(el => el !== newChatBtn);
                        historyBtn = siblings.find(el => el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button');
                    }
                }
            }

            // Fallback: Use previous heuristics (icon/aria-label)
            if (!historyBtn) {
                const allButtons = Array.from(document.querySelectorAll('button, [role="button"], a[data-tooltip-id]'));
                for (const btn of allButtons) {
                    if (btn.offsetParent === null) continue;
                    const hasHistoryIcon = btn.querySelector('svg.lucide-clock') ||
                                           btn.querySelector('svg.lucide-history') ||
                                           btn.querySelector('svg.lucide-folder') ||
                                           btn.querySelector('svg[class*="clock"]') ||
                                           btn.querySelector('svg[class*="history"]');
                    if (hasHistoryIcon) {
                        historyBtn = btn;
                        break;
                    }
                }
            }
            
            if (!historyBtn) {
                return { error: 'History button not found', chats: [] };
            }

            // Click and Wait
            historyBtn.click();
            await new Promise(r => setTimeout(r, 2000));
            
            // Find the side panel
            let panel = null;
            let inputsFoundDebug = [];
            
            // Strategy 1: The search input has specific placeholder
            let searchInput = null;
            const inputs = Array.from(document.querySelectorAll('input'));
            searchInput = inputs.find(i => {
                const ph = (i.placeholder || '').toLowerCase();
                return ph.includes('select') || ph.includes('conversation');
            });
            
            // Strategy 2: Look for any text input that looks like a search bar (based on user snippet classes)
            if (!searchInput) {
                const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
                inputsFoundDebug = allInputs.map(i => 'ph:' + i.placeholder + ', cls:' + i.className);
                
                searchInput = allInputs.find(i => 
                    i.offsetParent !== null && 
                    (i.className.includes('w-full') || i.classList.contains('w-full'))
                );
            }
            
            // Strategy 3: Find known text in the panel (Anchor Text Strategy)
            let anchorElement = null;
            if (!searchInput) {
                 const allSpans = Array.from(document.querySelectorAll('span, div, p'));
                 anchorElement = allSpans.find(s => {
                     const t = (s.innerText || '').trim();
                     return t === 'Current' || t === 'Refining Chat History Scraper'; // specific known title
                 });
            }

            const startElement = searchInput || anchorElement;

            if (startElement) {
                // Walk up to find the panel container
                let container = startElement;
                for (let i = 0; i < 15; i++) { 
                    if (!container.parentElement) break;
                    container = container.parentElement;
                    const rect = container.getBoundingClientRect();
                    
                    // Panel should have good dimensions
                    // Relaxed constraints for mobile
                    if (rect.width > 50 && rect.height > 100) {
                        panel = container;
                        
                        // If it looks like a modal/popover (fixed or absolute pos), that's definitely it
                        const style = window.getComputedStyle(container);
                        if (style.position === 'fixed' || style.position === 'absolute' || style.zIndex > 10) {
                            break;
                        }
                    }
                }
                
                // Fallback if loop finishes without specific break
                if (!panel && startElement) {
                     // Just go up 4 levels
                     let p = startElement;
                     for(let k=0; k<4; k++) { if(p.parentElement) p = p.parentElement; }
                     panel = p;
                }
            }
            
            const debugInfo = { 
                panelFound: !!panel, 
                panelWidth: panel?.offsetWidth || 0,
                inputFound: !!searchInput,
                anchorFound: !!anchorElement,
                inputsDebug: inputsFoundDebug.slice(0, 5)
            };
            
            if (panel) {
                // Chat titles are in <span> elements
                const spans = Array.from(panel.querySelectorAll('span'));
                
                // Section headers to skip
                const SKIP_EXACT = new Set([
                    'current', 'other conversations', 'now'
                ]);
                
                for (const span of spans) {
                    const text = span.textContent?.trim() || '';
                    const lower = text.toLowerCase();
                    
                    // Skip empty or too short
                    if (text.length < 3) continue;
                    
                    // Skip section headers
                    if (SKIP_EXACT.has(lower)) continue;
                    if (lower.startsWith('recent in ')) continue;
                    if (lower.startsWith('show ') && lower.includes('more')) continue;
                    
                    // Skip timestamps
                    if (lower.endsWith(' ago') || /^\\d+\\s*(sec|min|hr|day|wk|mo|yr)/i.test(lower)) continue;
                    
                    // Skip very long text (containers)
                    if (text.length > 100) continue;
                    
                    // Skip duplicates
                    if (seenTitles.has(text)) continue;
                    
                    seenTitles.add(text);
                    chats.push({ title: text, date: 'Recent' });
                    
                    if (chats.length >= 50) break;
                }
            }
            
            // Note: Panel is left open on PC as requested ("launch history on pc")

            return { success: true, chats: chats, debug: debugInfo };
        } catch(e) {
            return { error: e.toString(), chats: [] };
        }
    })()`;

    let lastError = null;
    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) {
                const val = res.result.value;
                if (val.success) return val;
                if (val.error) lastError = val.error;
            }
            // If result.value is null/undefined but no error thrown, check exceptionDetails
            if (res.exceptionDetails) {
                lastError = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
            }
        } catch (e) {
            lastError = e.message;
        }
    }
    return { error: 'Context failed: ' + (lastError || 'No contexts available'), chats: [] };
}

/**
 * Select a specific chat from the history panel by title.
 * @param {import('./state.js').CDPConnection} cdp
 * @param {string} chatTitle
 * @returns {Promise<{success?: boolean, method?: string, error?: string}>}
 */
async function selectChat(cdp, chatTitle) {
    const safeChatTitle = JSON.stringify(chatTitle);

    const EXP = `(async () => {
    try {
        const targetTitle = ${safeChatTitle};

        // First, we need to open the history panel
        // Find the history button at the top (next to + button)
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));

        let historyBtn = null;

        // Find by icon type
        for (const btn of allButtons) {
            if (btn.offsetParent === null) continue;
            const hasHistoryIcon = btn.querySelector('svg.lucide-clock') ||
                btn.querySelector('svg.lucide-history') ||
                btn.querySelector('svg.lucide-folder') ||
                btn.querySelector('svg.lucide-clock-rotate-left');
            if (hasHistoryIcon) {
                historyBtn = btn;
                break;
            }
        }

        // Fallback: Find by position (second button at top)
        if (!historyBtn) {
            const topButtons = allButtons.filter(btn => {
                if (btn.offsetParent === null) return false;
                const rect = btn.getBoundingClientRect();
                return rect.top < 100 && rect.top > 0;
            }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

            if (topButtons.length >= 2) {
                historyBtn = topButtons[1];
            }
        }

        if (historyBtn) {
            historyBtn.click();
            await new Promise(r => setTimeout(r, 600));
        }

        // Now find the chat by title in the opened panel
        await new Promise(r => setTimeout(r, 200));

        const allElements = Array.from(document.querySelectorAll('*'));

        // Find elements matching the title
        const candidates = allElements.filter(el => {
            if (el.offsetParent === null) return false;
            const text = el.innerText?.trim();
            return text && text.startsWith(targetTitle.substring(0, Math.min(30, targetTitle.length)));
        });

        // Find the most specific (deepest) visible element with the title
        let target = null;
        let maxDepth = -1;

        for (const el of candidates) {
            // Skip if it has too many children (likely a container)
            if (el.children.length > 5) continue;

            let depth = 0;
            let parent = el;
            while (parent) {
                depth++;
                parent = parent.parentElement;
            }

            if (depth > maxDepth) {
                maxDepth = depth;
                target = el;
            }
        }

        if (target) {
            // Find clickable parent if needed
            let clickable = target;
            for (let i = 0; i < 5; i++) {
                if (!clickable) break;
                const style = window.getComputedStyle(clickable);
                if (style.cursor === 'pointer' || clickable.tagName === 'BUTTON') {
                    break;
                }
                clickable = clickable.parentElement;
            }

            if (clickable) {
                clickable.click();
                return { success: true, method: 'clickable_parent' };
            }

            target.click();
            return { success: true, method: 'direct_click' };
        }

        return { error: 'Chat not found: ' + targetTitle };
    } catch (e) {
        return { error: e.toString() };
    }
})()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) {
                const val = res.result.value;
                if (val.success) return val;
            }
        } catch (e) { }
    }
    return { error: 'Context failed' };
}

/**
 * Check if a chat is currently open (has a cascade/conversation element).
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{hasChat: boolean, hasMessages: boolean, editorFound: boolean}>}
 */
async function hasChatOpen(cdp) {
    const EXP = `(() => {
    const chatContainer = document.getElementById('conversation') || document.getElementById('chat') || document.getElementById('cascade');
    const hasMessages = chatContainer && chatContainer.querySelectorAll('[class*="message"], [data-message]').length > 0;
    return {
        hasChat: !!chatContainer,
        hasMessages: hasMessages,
        editorFound: !!(chatContainer && chatContainer.querySelector('[data-lexical-editor="true"]'))
    };
})()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                contextId: ctx.id
            });
            if (res.result?.value) {
                const val = res.result.value;
                if (val.hasChat || val.hasMessages || val.editorFound) {
                    return val;
                }
            }
        } catch (e) { }
    }
    return { hasChat: false, hasMessages: false, editorFound: false };
}

/**
 * Get the current app state ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â active mode and AI model.
 * @param {import('./state.js').CDPConnection} cdp
 * @returns {Promise<{mode: string, model: string, error?: string} | {error: string}>}
 */
async function getAppState(cdp) {
    const EXP = `(async () => {
    try {
        const state = { mode: 'Unknown', model: 'Unknown' };

        // 1. Get Mode (Fast/Planning)
        // Strategy: Find the clickable mode button which contains either "Fast" or "Planning"
        // It's usually a button or div with cursor:pointer containing the mode text
        const allEls = Array.from(document.querySelectorAll('*'));

        // Find elements that are likely mode buttons
        for (const el of allEls) {
            if (el.children.length > 0) continue;
            const text = (el.innerText || '').trim();
            if (text !== 'Fast' && text !== 'Planning') continue;

            // Check if this or a parent is clickable (the actual mode selector)
            let current = el;
            for (let i = 0; i < 5; i++) {
                if (!current) break;
                const style = window.getComputedStyle(current);
                if (style.cursor === 'pointer' || current.tagName === 'BUTTON') {
                    state.mode = text;
                    break;
                }
                current = current.parentElement;
            }
            if (state.mode !== 'Unknown') break;
        }

        // Fallback: Just look for visible text
        if (state.mode === 'Unknown') {
            const textNodes = allEls.filter(el => el.children.length === 0 && el.innerText);
            if (textNodes.some(el => el.innerText.trim() === 'Planning')) state.mode = 'Planning';
            else if (textNodes.some(el => el.innerText.trim() === 'Fast')) state.mode = 'Fast';
        }

        // 2. Get Model
        // Strategy: Look for leaf text nodes containing a known model keyword
        const KNOWN_MODELS = ["Gemini", "Claude", "GPT"];
        const textNodes2 = allEls.filter(el => el.children.length === 0 && el.innerText);
        
        // First try: find inside a clickable parent (button, cursor:pointer)
        let modelEl = textNodes2.find(el => {
            const txt = el.innerText.trim();
            if (!KNOWN_MODELS.some(k => txt.includes(k))) return false;
            // Must be in a clickable context (header/toolbar, not chat content)
            let parent = el;
            for (let i = 0; i < 8; i++) {
                if (!parent) break;
                if (parent.tagName === 'BUTTON' || window.getComputedStyle(parent).cursor === 'pointer') return true;
                parent = parent.parentElement;
            }
            return false;
        });
        
        // Fallback: any leaf node with a known model name
        if (!modelEl) {
            modelEl = textNodes2.find(el => {
                const txt = el.innerText.trim();
                return KNOWN_MODELS.some(k => txt.includes(k)) && txt.length < 60;
            });
        }

        if (modelEl) {
            state.model = modelEl.innerText.trim();
        }

        return state;
    } catch (e) { return { error: e.toString() }; }
})()`;

    for (const ctx of cdp.contexts) {
        try {
            const res = await cdp.call("Runtime.evaluate", {
                expression: EXP,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });
            if (res.result?.value) {
                const val = res.result.value;
                if (val.mode !== 'Unknown' || val.model !== 'Unknown') return val;
            }
        } catch (e) { }
    }
    return { error: 'Context failed' };
}

/**
 * Identify and click the waiting action button (Accept/Run/Allow vs Reject/Deny)
 * @param {import('./state.js').CDPConnection} cdp
 * @param {'accept' | 'reject'} action
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
/**
 * Inspect the currently visible Antigravity interaction dialog.
 *
 * Returns the actual options shown by Antigravity rather than assuming
 * that every interaction is simply Accept/Reject.
 */
async function getPendingInteraction(cdp) {
    for (const ctx of cdp.contexts) {
        try {
            const result = await cdp.call('Runtime.evaluate', {
                expression: `(async () => {
                    try {
                        const visible = el => {
                            if (!el) return false;
                            const style = getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            return style.display !== 'none' &&
                                   style.visibility !== 'hidden' &&
                                   rect.width > 0 &&
                                   rect.height > 0;
                        };

                        const radios = Array.from(
                            document.querySelectorAll('input[type="radio"]')
                        );

                        const options = radios
                            .map((radio, index) => {
                                const id = radio.id;
                                const label = id
                                    ? document.querySelector(
                                        'label[for="' +
                                        CSS.escape(id) +
                                        '"]'
                                      )
                                    : null;

                                if (!label || !visible(label)) return null;

                                const text = (
                                    label.innerText ||
                                    label.textContent ||
                                    ''
                                ).replace(/\\s+/g, ' ').trim();

                                if (!text) return null;

                                return {
                                    key: 'option-' + index,
                                    text,
                                    value: radio.value,
                                    checked: !!radio.checked
                                };
                            })
                            .filter(Boolean);

                        if (!options.length) {
                            return null;
                        }

                        const submit = Array.from(
                            document.querySelectorAll(
                                'button[data-testid="interaction-continue-button"]'
                            )
                        ).find(visible);

                        if (!submit) {
                            return null;
                        }

                        let title = '';

                        const titleCandidates = Array.from(
                            document.querySelectorAll(
                                '[role="dialog"], [role="alertdialog"], h1, h2, h3'
                            )
                        );

                        for (const el of titleCandidates) {
                            if (!visible(el)) continue;

                            const text = (
                                el.innerText ||
                                el.textContent ||
                                ''
                            ).replace(/\\s+/g, ' ').trim();

                            if (
                                text &&
                                (
                                    text.toLowerCase().includes('allow') ||
                                    text.toLowerCase().includes('permission') ||
                                    text.toLowerCase().includes('run')
                                )
                            ) {
                                title = text;
                                break;
                            }
                        }

                        if (!title) {
                            const bodyText = (
                                document.body?.innerText || ''
                            ).replace(/\\s+/g, ' ');

                            const match = bodyText.match(
                                /Allow running[^\\n]{0,200}/i
                            );

                            if (match) {
                                title = match[0].trim();
                            }
                        }

                        return {
                            title: title || 'Antigravity requires your input',
                            options
                        };
                    } catch (e) {
                        return {
                            error: String(e)
                        };
                    }
                })()`,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });

            if (result?.result?.value) {
                return result.result.value;
            }
        } catch (e) {}
    }

    return null;
}

/**
 * Execute one of the actual options currently displayed by Antigravity.
 *
 * @param {import('./state.js').CDPConnection} cdp
 * @param {string} optionKey
 */
async function completePendingInteraction(cdp, optionKey) {
    for (const ctx of cdp.contexts) {
        try {
            const result = await cdp.call('Runtime.evaluate', {
                expression: `(async () => {
                    try {
                        const visible = el => {
                            if (!el) return false;
                            const style = getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            return style.display !== 'none' &&
                                   style.visibility !== 'hidden' &&
                                   rect.width > 0 &&
                                   rect.height > 0;
                        };

                        const radios = Array.from(
                            document.querySelectorAll('input[type="radio"]')
                        );

                        const candidates = radios
                            .map((radio, index) => {
                                const id = radio.id;
                                const label = id
                                    ? document.querySelector(
                                        'label[for="' +
                                        CSS.escape(id) +
                                        '"]'
                                      )
                                    : null;

                                if (!label || !visible(label)) return null;

                                return {
                                    radio,
                                    label,
                                    key: 'option-' + index,
                                    text: (
                                        label.innerText ||
                                        label.textContent ||
                                        ''
                                    ).replace(/\\s+/g, ' ').trim()
                                };
                            })
                            .filter(Boolean);

                        const selected = candidates.find(
                            item => item.key === ${JSON.stringify(optionKey)}
                        );

                        if (!selected) {
                            return {
                                error: 'The selected option is no longer available'
                            };
                        }

                        selected.label.click();

                        await new Promise(r => setTimeout(r, 300));

                        if (!selected.radio.checked) {
                            selected.radio.click();
                            await new Promise(r => setTimeout(r, 200));
                        }

                        if (!selected.radio.checked) {
                            return {
                                error: 'Could not select the requested option'
                            };
                        }

                        const submit = Array.from(
                            document.querySelectorAll(
                                'button[data-testid="interaction-continue-button"]'
                            )
                        ).find(visible);

                        if (!submit) {
                            return {
                                error: 'Antigravity Submit button not found'
                            };
                        }

                        if (submit.disabled) {
                            return {
                                error: 'Antigravity Submit button is disabled'
                            };
                        }

                        submit.click();

                        await new Promise(r => setTimeout(r, 1000));

                        return {
                            success: true,
                            selectedOption: selected.text
                        };
                    } catch (e) {
                        return {
                            error: String(e)
                        };
                    }
                })()`,
                returnByValue: true,
                awaitPromise: true,
                contextId: ctx.id
            });

            if (result?.result?.value) {
                return result.result.value;
            }
        } catch (e) {}
    }

    return {
        error: 'Antigravity interaction control not found'
    };
}

// Backward-compatible wrapper for existing supervisor/Telegram code.
// Existing accept/reject callers remain functional while the phone UI
// transitions to the new dynamic interaction system.
async function completePendingAction(cdp, action) {
    const interaction = await getPendingInteraction(cdp);

    if (!interaction?.options?.length) {
        return {
            error: 'No active Antigravity interaction found'
        };
    }

    const lower = text =>
        String(text || '').toLowerCase();

    let selected = null;

    if (action === 'accept') {
        selected =
            interaction.options.find(o =>
                /allow this time|allow once|yes.*allow/i.test(o.text)
            ) ||
            interaction.options.find(o =>
                /always allow|allow always|yes/i.test(o.text)
            ) ||
            interaction.options.find(o =>
                /allow|run|continue|proceed|confirm/i.test(o.text)
            );
    } else {
        selected =
            interaction.options.find(o =>
                /no|deny|reject|cancel|abort/i.test(o.text)
            );
    }

    if (!selected) {
        return {
            error: `Could not map legacy action "${action}" to an available option`
        };
    }

    return completePendingInteraction(cdp, selected.key);
}
// hashString ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ src/utils/hash.js
// isLocalRequest ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ src/utils/network.js
// initCDP ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ src/cdp/connection.js

/**
 * Background polling with exponential backoff and CDP status broadcast.
 * @param {import('ws').WebSocketServer} wss
 * @returns {Promise<void>}
 */
async function startPolling(wss) {
    let lastErrorLog = 0;
    let isConnecting = false;
    let reconnectDelay = 2000; // Start at 2s, max 30s
    const MAX_RECONNECT_DELAY = 30000;
    let reconnectAttempts = 0;
    let heartbeatInterval = null;
    let lastNotificationTime = 0;
    let lastActionNotificationTime = 0;
    let lastAutoApprovalTime = 0;
    let lastDialogErrorTime = 0;

    // WebSocket ping/pong heartbeat (every 30s)
    heartbeatInterval = setInterval(() => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.ping();
            }
        });
    }, 30000);

    // Broadcast CDP status to all mobile clients
    /** @param {string} status */
function broadcastCDPStatus(status) {
        broadcast({ type: 'cdp_status', status, timestamp: new Date().toISOString() });
    }

    const poll = async () => {
        // Periodically refresh available targets list (multi-window)
        try {
            availableTargets = await discoverAllCDP();
            if (!activeTargetId && availableTargets.length === 1) {
                activeTargetId = availableTargets[0].id;
            }
        } catch (e) { /* ignore */ }

        if (!cdpConnection || (cdpConnection.ws && cdpConnection.ws.readyState !== WebSocket.OPEN)) {
            if (!isConnecting) {
                console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â Looking for Antigravity CDP connection...');
                isConnecting = true;
                broadcastCDPStatus('reconnecting');
            }
            if (cdpConnection) {
                console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ CDP connection lost. Attempting to reconnect...');
                await stopScreencast();
                cdpConnection = null;
            }
            try {
                cdpConnection = await initCDP();
                if (cdpConnection) {
                    console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ CDP Connection established from polling loop');
                    isConnecting = false;
                    reconnectDelay = 2000; // Reset backoff
                    reconnectAttempts = 0;
                    sessionStats.increment('reconnections');
                    sessionStats.logAction('cdp_reconnected');
                    broadcastCDPStatus('connected');
                }
            } catch (e) { const err = /** @type {Error} */ (e);
                reconnectAttempts++;
                reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
                if (reconnectAttempts % 5 === 0) {
                    console.log(`   ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â³ Reconnect attempt #${reconnectAttempts} (next in ${Math.round(reconnectDelay/1000)}s)`);
                }
            }
            setTimeout(poll, reconnectDelay);
            return;
        }

        try {
            // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Dialog Error Scanner (outside chat container) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
            // Scans for full-page modal errors in ALL CDP contexts
            // Pattern from tody-agent/AntigravityMobile:checkErrorDialogs
            const nowTime = Date.now();
            if (nowTime - lastDialogErrorTime > 30000) { // 30s cooldown
                try {
                    const dialogError = await checkErrorDialogs(cdpConnection);
                    if (dialogError) {
                        lastDialogErrorTime = nowTime;
                        sessionStats.increment('dialogErrorsDetected');
                        sessionStats.logError(dialogError.type, dialogError.error);
                        const typeEmoji = {
                            terminated: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬', quota: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€¦Ã‚Â ', rate_limit: 'ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â±ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â',
                            high_traffic: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¥', server_error: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¥', network_error: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â'
                        };
                        const emoji = typeEmoji[dialogError.type] || 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¨';
                        console.log(`${emoji} Dialog error detected: [${dialogError.type}] ${dialogError.error}`);
                        broadcast({
                            type: 'notification',
                            event: 'dialog_error',
                            errorType: dialogError.type,
                            message: `${emoji} ${dialogError.error}`,
                            timestamp: new Date().toISOString()
                        });
                        sendTelegramNotification(`${emoji} <b>Antigravity Alert:</b> ${dialogError.error}`).then((sent) => {
                            trackTelegramNotification(sent);
                        }).catch(() => {});
                    }
                } catch (dialogErr) {
                    // non-critical ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â don't break polling
                }
            }
            
            if (!hasLoadedFullHistory) {
                // DOM sweep disabled in favor of SQLite conversationStore
                // await loadFullHistory(cdpConnection);
            }

            const snapshot = await captureSnapshot(cdpConnection);
            if (snapshot && !snapshot.error) {
                sessionStats.increment('snapshotsProcessed');
                const hash = hashString(snapshot.html);

                // --- Intercept Text indicating Agent Terminated or Quota ---
                const htmlLower = snapshot.html.toLowerCase();
                
                // 1. Check for Pending Actions (e.g., Run command) with specific cooldown
                let hasPendingAction = false;
                const legacyPendingAction = htmlLower.includes('run command') && (htmlLower.includes('reject') || htmlLower.includes('deny'));
                const modernPendingAction = htmlLower.includes('waiting for user input') && /<button[^>]*>[\s\S]*?\brun\b/i.test(snapshot.html);
                if (legacyPendingAction || modernPendingAction) {
                    hasPendingAction = true;
                    if (aiSupervisor.isSuggestModeEnabled()) {
                        const commandText = extractPendingCommand(snapshot.html);
                        if (!suggestQueue.hasPendingCommand(commandText)) {
                            try {
                                const review = await aiSupervisor.reviewPendingAction({ html: snapshot.html });
                                const result = suggestQueue.add({
                                    action: review.suggestedAction,
                                    command: review.commandText,
                                    reason: review.reason,
                                    source: review.source,
                                    summary: review.summary
                                });
                                if (result.created) {
                                    console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â Supervisor queued suggestion (${review.suggestedAction}) for pending action`);
                                }
                            } catch (e) { const error = /** @type {Error} */ (e);
                                console.warn(`Supervisor suggest-mode review failed: ${error.message}`);
                            }
                        }
                    } else {
                        if (nowTime - lastAutoApprovalTime > 15000) {
                            try {
                                const decision = await aiSupervisor.shouldApprove({ html: snapshot.html });
                                if (decision.approved) {
                                    const approval = await completePendingAction(cdpConnection, 'accept');
                                    if (approval.success) {
                                    lastAutoApprovalTime = nowTime;
                                    lastActionNotificationTime = nowTime;
                                    sessionStats.increment('actionsApproved');
                                    sessionStats.increment('actionsAutoApproved');
                                    sessionStats.logAction('action_auto_approved', {
                                        reason: decision.reason
                                    });
                                    broadcast({
                                        type: 'notification',
                                        event: 'action_auto_approved',
                                        message: `Supervisor local aprovou a acao pendente (${decision.reason}).`,
                                        timestamp: new Date().toISOString()
                                    });
                                    sendTelegramNotification('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ <b>Antigravity Supervisor:</b> uma aprovacao segura foi liberada automaticamente.').then((sent) => {
                                        trackTelegramNotification(sent);
                                    }).catch(() => {});
                                }
                            }
                            } catch (e) { const error = /** @type {Error} */ (e);
                                console.warn(`Supervisor check failed: ${error.message}`);
                            }
                        }

                        if (nowTime - lastActionNotificationTime > 15000 && nowTime - lastAutoApprovalTime > 5000) {
                            lastActionNotificationTime = nowTime;
                            const msg = 'Agent requires approval format (Run Command).';
                            broadcast({
                                type: 'notification',
                                event: 'action_required',
                                message: msg,
                                timestamp: new Date().toISOString()
                            });
                            console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Alert triggered: Action Pending`);
                            sendTelegramNotification('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â <b>Antigravity Action Required!</b>\\nO Agente parou a execuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o e aguarda aprovaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o manual.').then((sent) => {
                                trackTelegramNotification(sent);
                            }).catch(() => {});
                        }
                    }
                }

                // 2. Check for Quota or Termination with specific cooldown
                if (nowTime - lastNotificationTime > 60000) { // 1 min cooldown
                    let notifyType = null;
                    let notifyMessage = '';
                    if (htmlLower.includes('model quota reached') || htmlLower.includes('usage limit') || htmlLower.includes('quota exhausted')) {
                        notifyType = 'quota_error';
                        notifyMessage = 'Model Quota Exceeded!';
                        sessionStats.increment('quotaWarnings');
                        sessionStats.logError('quota', notifyMessage);
                    } else if (htmlLower.includes('agent terminated') || htmlLower.includes('agent stopped') || htmlLower.includes('terminated due to error')) {
                        notifyType = 'agent_error';
                        notifyMessage = 'Agent Terminated or Blocked!';
                        sessionStats.logError('agent_error', notifyMessage);
                    } else if (htmlLower.includes('rate limit') || htmlLower.includes('too many requests')) {
                        notifyType = 'rate_limit';
                        notifyMessage = 'Rate Limit Hit!';
                        sessionStats.increment('rateLimitHits');
                        sessionStats.logError('rate_limit', notifyMessage);
                    } else if (htmlLower.includes('task completed') && htmlLower.includes('i have completed the task')) {
                        notifyType = 'task_completed';
                        notifyMessage = 'Task Completed Successfully!';
                        sessionStats.logAction('task_completed');
                    }
                    
                    if (notifyType) {
                        lastNotificationTime = nowTime;
                        broadcast({
                            type: 'notification',
                            event: notifyType,
                            message: notifyMessage,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Alert triggered: ${notifyMessage}`);
                        
                        const emoji = notifyType === 'task_completed' ? 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¨';
                        sendTelegramNotification(`${emoji} <b>Antigravity Notification:</b> ${notifyMessage}`).then((sent) => {
                            trackTelegramNotification(sent);
                        }).catch(() => {});
                    }
                }
                // ---------------------------------------------------------------

                if (hash !== lastSnapshotHash) {
                    lastSnapshot = snapshot;
                    lastSnapshotHash = hash;
                    sessionStats.increment('snapshotUpdatesBroadcast');
                    broadcast({
                        type: 'snapshot_update',
                        timestamp: new Date().toISOString()
                    });

                    console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¸ Snapshot updated(hash: ${hash})`);
                }
            } else {
                const now = Date.now();
                if (!lastErrorLog || now - lastErrorLog > 10000) {
                    const errorMsg = snapshot?.error || 'No valid snapshot captured (check contexts)';
                    sessionStats.logError('snapshot_capture', errorMsg);
                    console.warn(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Snapshot capture issue: ${errorMsg} `);
                    if (errorMsg.includes('container not found')) {
                        console.log('   (Tip: Ensure an active chat is open in Antigravity)');
                    }
                    if (cdpConnection.contexts.length === 0) {
                        console.log('   (Tip: No active execution contexts found. Try interacting with the Antigravity window)');
                    }
                    lastErrorLog = now;
                }
            }
        } catch (e) { const err = /** @type {Error} */ (e);
            console.error('Poll error:', err.message);
        }

        setTimeout(poll, POLL_INTERVAL);
    };

    poll();
}

// Create Express app
async function createServer() {
    const app = express();
    await ensureWorkspaceData();

    // Check for SSL certificates
    const keyPath = join(PROJECT_ROOT, 'certs', 'server.key');
    const certPath = join(PROJECT_ROOT, 'certs', 'server.cert');
    const hasSSL = fs.existsSync(keyPath) && fs.existsSync(certPath);

    let server;
    let httpsServer = null;

    if (hasSSL) {
        const sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        httpsServer = https.createServer(sslOptions, app);
        server = httpsServer;
    } else {
        server = http.createServer(app);
    }

    const wss = new WebSocketServer({ server });
    websocketServer = wss;
    await screenshotTimeline.init();
    if (!suggestionQueueUnsubscribe) {
        suggestionQueueUnsubscribe = suggestQueue.subscribe((event, payload) => {
            if (event === 'added') {
                sessionStats.increment('suggestionsCreated');
                sessionStats.logAction('suggestion_created', {
                    action: payload.action,
                    reason: payload.reason
                });
            } else if (event === 'approved') {
                sessionStats.increment('suggestionsApproved');
                sessionStats.logAction('suggestion_approved', {
                    action: payload.action
                });
            } else if (event === 'rejected') {
                sessionStats.increment('suggestionsRejected');
                sessionStats.logAction('suggestion_rejected', {
                    action: payload.action
                });
            } else if (event === 'expired' && payload?.command) {
                sessionStats.logAction('suggestion_expired', {
                    command: payload.command
                });
            }

            if (event === 'added') {
                broadcast({
                    type: 'suggestion',
                    event: 'new_suggestion',
                    suggestion: payload,
                    pendingCount: suggestQueue.getPendingCount(),
                    timestamp: new Date().toISOString()
                });
                sendSuggestionRequired(payload).then((sent) => {
                    trackTelegramNotification(sent);
                }).catch(() => {});
            } else {
                broadcast({
                    type: 'suggestion',
                    event,
                    suggestion: payload?.id ? payload : null,
                    pendingCount: suggestQueue.getPendingCount(),
                    timestamp: new Date().toISOString()
                });
            }

            broadcastSuggestionState();
        });
    }
    if (!sessionStatsUnsubscribe) {
        sessionStatsUnsubscribe = sessionStats.subscribe(() => {
            broadcastStatsState();
        });
    }
    if (!quotaServiceUnsubscribe) {
        quotaServiceUnsubscribe = quotaService.subscribe((event, summary) => {
            broadcastQuotaState();
            if (event !== 'updated' || !Array.isArray(summary?.alerts) || !summary.alerts.length) {
                return;
            }

            const lines = summary.alerts.slice(0, 4).map((model) =>
                `ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ <b>${model.name}</b>: ${model.usagePercent}% used`
            );
            sendTypedNotification(
                'warning',
                [
                    'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â <b>Model quota alert</b>',
                    ...lines,
                    summary.lastUpdated
                        ? `Updated: ${new Date(summary.lastUpdated).toLocaleTimeString()}`
                        : ''
                ].filter(Boolean).join('\n')
            ).then((sent) => {
                trackTelegramNotification(sent);
            }).catch(() => {});
        });
    }
    if (!timelineUnsubscribe) {
        timelineUnsubscribe = screenshotTimeline.subscribe((event, summary, payload) => {
            if (event === 'captured' && payload?.entry) {
                sessionStats.increment('timelineCaptures');
                sessionStats.logAction('timeline_capture_saved', {
                    reason: payload.entry.reason,
                    filename: payload.entry.filename
                });
            } else if (event === 'cleared') {
                sessionStats.logAction('timeline_cleared', {
                    cleared: payload?.cleared || 0
                });
            }

            broadcastTimelineState();
        });
    }
    quotaService.start();
    quotaService.refresh().catch(() => {});
    screenshotTimeline.start({
        getSnapshotHash: () => lastSnapshotHash || '',
        captureScreenshot: () => captureCurrentScreenshot({
            format: 'jpeg',
            quality: 70
        })
    });
    terminalManager.on('output', (entry) => {
        broadcast({ type: 'terminal_output', entry });
    });
    terminalManager.on('exit', (terminalState) => {
        broadcast({ type: 'terminal_state', state: terminalState });
    });
    Object.entries(tunnelManagers).forEach(([provider, manager]) => {
        manager.on('url', () => {
            tunnelProvider = provider;
            broadcastTunnelStatus();
        });
        manager.on('exit', () => {
            if (tunnelProvider === provider) {
                broadcastTunnelStatus();
            }
        });
    });

    // Initialize session security & token
    AUTH_TOKEN = hashString(APP_PASSWORD + AUTH_SALT + Date.now().toString());

    // Check for --launch argument
    if (process.argv.includes('--launch')) {
        console.log('CLI flag --launch detected. Spawning new Antigravity instance...');
        try {
            await launchAntigravity();
        } catch (e) {
            console.error('Failed to auto-launch Antigravity:', e.message);
        }
    }

    app.use(compression());
    app.use(express.json({ limit: JSON_BODY_LIMIT }));
    app.use(cookieParser(COOKIE_SECRET));
    app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
        next();
    });

    // Ngrok Bypass Middleware
    app.use((req, res, next) => {
        // Tell ngrok to skip the "visit" warning for API requests
        res.setHeader('ngrok-skip-browser-warning', 'true');
        next();
    });

    // Auth Middleware
    app.use((req, res, next) => {
        const publicPaths = ['/login', '/login.html', '/favicon.ico', '/manifest.json', '/sw.js', '/js/login.js'];
        if (
            publicPaths.includes(req.path) ||
            req.path.startsWith('/css/') ||
            req.path.startsWith('/icons/')
        ) {
            return next();
        }

        // Exempt local Wi-Fi devices from authentication
        if (isLocalRequest(req)) {
            return next();
        }

        // Magic Link / QR Code Auto-Login
        if (req.query.key === APP_PASSWORD) {
            res.cookie(AUTH_COOKIE_NAME, AUTH_TOKEN, {
                httpOnly: true,
                signed: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            // Remove the key from the URL by redirecting to the base path
            return res.redirect('/');
        }

        const token = req.signedCookies[AUTH_COOKIE_NAME];
        if (token === AUTH_TOKEN) {
            return next();
        }

        // If it's an API request, return 401, otherwise redirect to login
        if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/snapshot') || req.path.startsWith('/send')) {
            res.status(401).json({ error: 'Unauthorized' });
        } else {
            res.redirect('/login.html');
        }
    });

    app.get('/admin', (req, res) => {
        res.sendFile(join(PROJECT_ROOT, 'public', 'admin.html'));
    });

    app.get('/minimal', (req, res) => {
        res.sendFile(join(PROJECT_ROOT, 'public', 'minimal.html'));
    });

    app.use('/uploads', express.static(uploadsDir));
    app.use(express.static(join(PROJECT_ROOT, 'public')));

    // Login endpoint
    app.post('/login', (req, res) => {
        const { password } = req.body;
        if (password === APP_PASSWORD) {
            res.cookie(AUTH_COOKIE_NAME, AUTH_TOKEN, {
                httpOnly: true,
                signed: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    });

    // Logout endpoint
    app.post('/logout', (req, res) => {
        res.clearCookie(AUTH_COOKIE_NAME);
        res.json({ success: true });
    });

    // Get current snapshot
    app.get('/snapshot', (req, res) => {
        if (!lastSnapshot) {
            return res.status(503).json({ error: 'No snapshot available yet' });
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(lastSnapshot);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            cdpConnected: cdpConnection?.ws?.readyState === 1, // WebSocket.OPEN = 1
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            https: hasSSL,
            clients: getOpenClientCount(),
            tunnel: {
                provider: tunnelProvider,
                ...getTunnelStatus()
            },
            version: VERSION
        });
    });

    // SSL status endpoint
    app.get('/ssl-status', (req, res) => {
        const keyPath = join(PROJECT_ROOT, 'certs', 'server.key');
        const certPath = join(PROJECT_ROOT, 'certs', 'server.cert');
        const certsExist = fs.existsSync(keyPath) && fs.existsSync(certPath);
        res.json({
            enabled: hasSSL,
            certsExist: certsExist,
            message: hasSSL ? 'HTTPS is active' :
                certsExist ? 'Certificates exist, restart server to enable HTTPS' :
                    'No certificates found'
        });
    });

    // Generate SSL certificates endpoint
    app.post('/generate-ssl', async (req, res) => {
        try {
            const { execSync } = await import('child_process');
            execSync('node scripts/generate_ssl.js', { cwd: PROJECT_ROOT, stdio: 'pipe' });
            res.json({
                success: true,
                message: 'SSL certificates generated! Restart the server to enable HTTPS.'
            });
        } catch (e) {
            res.status(500).json({
                success: false,
                error: e.message
            });
        }
    });

    // Debug UI Endpoint
    app.get('/debug-ui', async (req, res) => {
        if (!cdpConnection) return res.status(503).json({ error: 'CDP not connected' });
        const uiTree = await inspectUI(cdpConnection);
        console.log('--- UI TREE ---');
        console.log(uiTree);
        console.log('---------------');
        res.type('json').send(uiTree);
    });

    // Set Mode
    app.post('/set-mode', async (req, res) => {
        const { mode } = req.body;
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
        const result = await setMode(cdpConnection, mode);
        res.json(result);
    });

    // Set Model
    app.post('/set-model', async (req, res) => {
        const { model } = req.body;
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
        const result = await setModel(cdpConnection, model);
        res.json(result);
    });

    // Stop Generation
    app.post('/stop', async (req, res) => {
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
        const result = await stopGeneration(cdpConnection);
        res.json(result);
    });

    // Inspect the actual Antigravity interaction options.
    app.get('/api/pending-interaction', async (req, res) => {
        if (!cdpConnection) {
            return res.status(503).json({
                error: 'CDP disconnected'
            });
        }

        const interaction = await getPendingInteraction(cdpConnection);

        if (!interaction) {
            return res.json({
                active: false
            });
        }

        res.json({
            active: true,
            interaction
        });
    });
    // Interact with pending actions (Accept/Reject)
    app.post('/api/interact-action', async (req, res) => {
        const { action, optionKey } = req.body;
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
        const result = await completePendingAction(cdpConnection, action, optionKey);
        if (result.success) {
            if (action === 'accept') {
                sessionStats.increment('actionsApproved');
            } else if (action === 'reject') {
                sessionStats.increment('actionsRejected');
            }
            sessionStats.logAction('manual_pending_action', { action });
        }
        res.json(result);
    });


    app.get('/api/artifacts', async (req, res) => {
        try {
            const data = await listArtifacts();
            
            // Inject the dynamic Current Conversation document
            data.files.unshift({
                name: 'Current Conversation',
                id: 'current_conversation',
                isVirtual: true,
                size: lastSnapshot ? lastSnapshot.html.length : 0,
                modified: new Date().toISOString()
            });
            
            res.json({ success: true, ...data });
        } catch (error) {
            console.error('Error listing artifacts:', error);
            res.status(500).json({ success: false, error: String(error) });
        }
    });

    // Get the dynamic Current Conversation JSON directly from SQLite
    app.get('/api/conversation.json', async (req, res) => {
        try {
            const convo = await conversationStore.getCurrentConversation();
            if (!convo || !convo.messages || convo.messages.length === 0) {
                return res.status(404).json({ error: 'No active conversation state available.' });
            }
            res.json({
                available: true,
                conversationId: convo.conversationId,
                title: convo.title,
                messages: convo.messages
            });
        } catch (error) {
            console.error('Error fetching conversation JSON:', error);
            res.status(500).json({ error: 'Failed to fetch conversation.' });
        }
    });

    // Get the dynamic Current Conversation HTML directly from SQLite
    app.get('/api/current-conversation', async (req, res) => {
        try {
            const convo = await conversationStore.getCurrentConversation();
            if (!convo || !convo.messages || convo.messages.length === 0) {
                return res.status(404).send('<div style="padding:16px;">No active conversation state available.</div>');
            }
            
            // Build simple clean HTML
            let html = `<div style="padding: 16px; font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #fff;">`;
            html += `<h2 style="margin-bottom: 24px; border-bottom: 1px solid #333; padding-bottom: 8px;">${convo.title || 'Current Conversation'} <small style="font-size:12px; color:#aaa; margin-left:8px;">${convo.conversationId}</small></h2>`;
            
            for (const msg of convo.messages) {
                const bg = msg.role === 'user' ? '#2A2D35' : (msg.role === 'tool_call' || msg.role === 'tool_result' ? '#1A1C20' : '#1E1E1E');
                const border = msg.role === 'user' ? 'border: 1px solid #444;' : '';
                const title = msg.role.toUpperCase();
                
                // Escape simple HTML
                let content = msg.content
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                
                // Very basic markdown formatting for display
                content = content.replace(/\\n/g, '<br/>');
                
                html += `
                <div style="background: ${bg}; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; ${border}">
                    <div style="font-size: 11px; font-weight: bold; color: #888; margin-bottom: 8px; text-transform: uppercase;">${title}</div>
                    <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${content}</div>
                </div>`;
            }
            html += `</div>`;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (error) {
            console.error('Error serving current conversation:', error);
            res.status(500).send(String(error));
        }
    });

    app.get('/api/artifacts/:id(*)', async (req, res) => {
        try {
            const content = await readArtifact(req.params.id);
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(content);
        } catch (error) {
            console.error(`Error reading artifact ${req.params.id}:`, error);
            res.status(500).send(String(error));
        }
    });

    app.get('/api/suggestions', (req, res) => {
        res.json(getSuggestionState());
    });

    app.get('/api/suggestions/pending', (req, res) => {
        res.json({
            suggestMode: aiSupervisor.isSuggestModeEnabled(),
            pendingCount: suggestQueue.getPendingCount(),
            suggestions: suggestQueue.getPending()
        });
    });

    app.post('/api/suggestions/:id/approve', async (req, res) => {
        const result = await approveQueuedSuggestion(String(req.params.id || ''));
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    });

    app.post('/api/suggestions/:id/reject', (req, res) => {
        const result = rejectQueuedSuggestion(String(req.params.id || ''));
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    });

    app.delete('/api/suggestions', (req, res) => {
        const cleared = suggestQueue.clear();
        res.json({ success: true, cleared });
    });

    app.get('/api/stats', (req, res) => {
        res.json(getStatsState());
    });

    app.get('/api/quota', async (req, res) => {
        const force = req.query.force === 'true';
        const summary = await quotaService.refresh({ explicit: force });
        res.json(summary);
    });

    // Model Status Indicator
    app.get('/api/model-status', async (req, res) => {
        if (!cdpConnection) return res.json({ running: false });
        const current = await getModelRunningState(cdpConnection);
        modelRunningState = current.running;
        res.json(current);
    });

    app.get('/api/screencast/status', (req, res) => {
        res.json(getScreencastStatus());
    });

    app.post('/api/screencast/start', async (req, res) => {
        try {
            const status = await startScreencast();
            res.json(status);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    app.post('/api/screencast/stop', async (req, res) => {
        await stopScreencast();
        res.json(getScreencastStatus());
    });

    app.post('/api/screencast/refresh', async (req, res) => {
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
        try {
            const result = await cdpConnection.call('Page.captureScreenshot', {
                format: 'jpeg',
                quality: 60
            });
            res.json({ data: result.data });
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    app.get('/api/timeline', async (req, res) => {
        await screenshotTimeline.init();
        res.json(getTimelineState());
    });

    app.get('/api/timeline/:filename', async (req, res) => {
        const file = await screenshotTimeline.resolveFile(String(req.params.filename || ''));
        if (!file) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        res.type(file.entry.mimeType || 'image/jpeg');
        res.sendFile(file.path);
    });

    app.post('/api/timeline/capture', async (req, res) => {
        try {
            const result = await screenshotTimeline.captureNow({
                reason: String(req.body?.reason || 'manual'),
                snapshotHash: lastSnapshotHash || '',
                force: true
            });
            res.json(result);
        } catch (e) { const error = /** @type {Error} */ (e);
            sessionStats.logError('timeline_capture', error.message);
            res.status(error.message.includes('CDP disconnected') ? 503 : 500).json({
                error: error.message,
                ...getTimelineState()
            });
        }
    });

    app.delete('/api/timeline', async (req, res) => {
        const result = await screenshotTimeline.clear();
        res.json(result);
    });

    app.get('/api/assist/history', (req, res) => {
        res.json({ messages: aiSupervisor.getAssistHistory() });
    });

    app.delete('/api/assist/history', (req, res) => {
        aiSupervisor.clearAssistHistory();
        sessionStats.logAction('assist_history_cleared');
        res.json({ success: true, messages: [] });
    });

    app.post('/api/assist/chat', async (req, res) => {
        const message = String(req.body?.message || '').trim();
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        try {
            const result = await aiSupervisor.chatWithUser(message, getAssistContext());
            sessionStats.logAction('assist_chat_message', {
                source: result.source,
                length: message.length
            });
            res.json(result);
        } catch (e) { const error = /** @type {Error} */ (e);
            sessionStats.logError('assist_chat', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Send message
    app.post('/send', async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        if (!cdpConnection) {
            return res.status(503).json({ error: 'CDP not connected' });
        }

        const result = await injectMessage(cdpConnection, message);
        if (result.ok !== false) {
            sessionStats.increment('messagesSent');
            sessionStats.logAction('message_sent', {
                length: message.length
            });
        }

        // Always return 200 - the message usually goes through even if CDP reports issues
        // The client will refresh and see if the message appeared
        res.json({
            success: result.ok !== false,
            method: result.method || 'attempted',
            details: result
        });
    });

    // Quick Commands
    app.get('/api/quick-commands', async (req, res) => {
        try {
            const commands = await loadQuickCommands();
            res.json({ commands });
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(500).json({ error: error.message });
        }
    });

    // Workspace file browser
    app.get('/api/fs/ls', async (req, res) => {
        try {
            const data = await listWorkspace(String(req.query.path || '.'));
            res.json(data);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.get('/api/fs/cat', async (req, res) => {
        try {
            const data = await readWorkspaceFile(String(req.query.path || ''));
            res.json(data);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    // Remote terminal
    app.get('/api/terminal/history', (req, res) => {
        res.json(terminalManager.getState());
    });

    app.post('/api/terminal/run', async (req, res) => {
        try {
            const data = await terminalManager.run(String(req.body.command || ''));
            res.json(data);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.post('/api/terminal/stop', async (req, res) => {
        const result = await terminalManager.stop();
        res.json(result);
    });

    // Git panel
    app.get('/api/git/status', async (req, res) => {
        try {
            const summary = await getGitSummary();
            res.json(summary);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/git/add', async (req, res) => {
        try {
            const result = await gitAdd(Array.isArray(req.body.paths) ? req.body.paths : []);
            res.json(result);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.post('/api/git/commit', async (req, res) => {
        try {
            const result = await gitCommit(String(req.body.message || ''));
            res.json(result);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.post('/api/git/push', async (req, res) => {
        try {
            const result = await gitPush();
            res.json(result);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    // Screencast status + controls
    app.get('/api/screencast/status', (req, res) => {
        res.json(getScreencastStatus());
    });

    app.post('/api/screencast/start', async (req, res) => {
        try {
            const status = await startScreencast();
            res.json(status);
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.post('/api/screencast/stop', async (req, res) => {
        await stopScreencast();
        res.json(getScreencastStatus());
    });

    // Image upload bridge
    app.post('/api/upload-image', async (req, res) => {
        try {
            const { data, mimeType, name, prompt = '', inject = true } = req.body || {};
            if (!data) {
                return res.status(400).json({ error: 'Image base64 data is required' });
            }

            const cleanData = String(data).replace(/^data:[^;]+;base64,/, '');
            const saved = await saveUploadedImage({
                name,
                mimeType,
                data: cleanData
            });

            let injection = null;
            if (inject) {
                if (!cdpConnection) {
                    return res.status(503).json({ error: 'CDP not connected', upload: saved });
                }

                const composedPrompt = [
                    prompt ? String(prompt).trim() : 'Please inspect this uploaded image.',
                    '',
                    `![mobile-upload](${saved.dataUrl})`
                ].join('\n').trim();

                injection = await injectMessage(cdpConnection, composedPrompt);
            }

            res.json({
                success: true,
                upload: saved,
                injection
            });
            if (inject && injection && injection.ok !== false) {
                sessionStats.increment('uploadsInjected');
                sessionStats.logAction('image_uploaded', {
                    name: saved.name
                });
            }
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    // Admin endpoints
    app.get('/api/admin/logs', (req, res) => {
        const limit = Number(req.query.limit || 80);
        res.json({ logs: getServerLogs(limit) });
    });

    app.get('/api/admin/metrics', async (req, res) => {
        try {
            const commands = await loadQuickCommands();
            res.json({
                startedAt: serverStartedAt,
                uptime: process.uptime(),
                version: VERSION,
                https: hasSSL,
                workspaceRoot,
                wsClients: getOpenClientCount(),
                cdpConnected: cdpConnection?.ws?.readyState === WebSocket.OPEN,
                cdpContexts: cdpConnection?.contexts.length || 0,
                availableTargets,
                activeTargetId,
                lastSnapshotStats: lastSnapshot?.stats || null,
                terminal: terminalManager.getState(),
                tunnel: {
                    provider: tunnelProvider,
                    ...getTunnelStatus()
                },
                supervisor: aiSupervisor.getStatus(),
                suggestions: getSuggestionState(),
                quota: getQuotaState(),
                timeline: getTimelineState(),
                screencast: getScreencastStatus(),
                quickCommandsCount: commands.length,
                recentLogs: getServerLogs(40)
            });
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(500).json({ error: error.message });
        }
    });

    app.put('/api/admin/quick-commands', async (req, res) => {
        try {
            const commands = await saveQuickCommands(req.body.commands);
            broadcast({ type: 'quick_commands_updated', commands, timestamp: new Date().toISOString() });
            res.json({ commands });
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(400).json({ error: error.message });
        }
    });

    app.get('/api/admin/tunnel', (req, res) => {
        res.json({
            provider: tunnelProvider,
            ...getTunnelStatus()
        });
    });

    app.post('/api/admin/tunnel/start', async (req, res) => {
        const provider = String(req.body.provider || 'cloudflare').toLowerCase();
        if (!getTunnelManager(provider)) {
            return res.status(400).json({ error: `Unsupported tunnel provider: ${provider}` });
        }

        try {
            const url = await startTunnel(provider, Number(SERVER_PORT), { tls: hasSSL, sniServerName: '127.0.0.1' });
            broadcastTunnelStatus();
            res.json({ success: true, url, provider });
        } catch (e) { const error = /** @type {Error} */ (e);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/admin/tunnel/stop', async (req, res) => {
        await stopActiveTunnel();
        broadcastTunnelStatus();
        res.json({ success: true, provider: tunnelProvider, ...getTunnelStatus() });
    });

    // UI Inspection endpoint - Returns all buttons as JSON for debugging
    app.get('/ui-inspect', async (req, res) => {
        if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });

        const EXP = `(() => {
    try {
        // Safeguard for non-DOM contexts
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return { error: 'Non-DOM context' };
        }

        // Helper to get string class name safely (handles SVGAnimatedString)
        function getCls(el) {
            if (!el) return '';
            if (typeof el.className === 'string') return el.className;
            if (el.className && typeof el.className.baseVal === 'string') return el.className.baseVal;
            return '';
        }

        // Helper to pierce Shadow DOM
        function findAllElements(selector, root = document) {
            let results = Array.from(root.querySelectorAll(selector));
            const elements = root.querySelectorAll('*');
            for (const el of elements) {
                try {
                    if (el.shadowRoot) {
                        results = results.concat(Array.from(el.shadowRoot.querySelectorAll(selector)));
                    }
                } catch (e) { }
            }
            return results;
        }

        // Get standard info
        const url = window.location ? window.location.href : '';
        const title = document.title || '';
        const bodyLen = document.body ? document.body.innerHTML.length : 0;
        const hasCascade = !!document.getElementById('cascade') || !!document.querySelector('.cascade');

        // Scan for buttons
        const allLucideElements = findAllElements('svg[class*="lucide"]').map(svg => {
            const parent = svg.closest('button, [role="button"], div, span, a');
            if (!parent || parent.offsetParent === null) return null;
            const rect = parent.getBoundingClientRect();
            return {
                type: 'lucide-icon',
                tag: parent.tagName.toLowerCase(),
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                svgClasses: getCls(svg),
                className: getCls(parent).substring(0, 100),
                ariaLabel: parent.getAttribute('aria-label') || '',
                title: parent.getAttribute('title') || '',
                parentText: (parent.innerText || '').trim().substring(0, 50)
            };
        }).filter(Boolean);

        const buttons = findAllElements('button, [role="button"]').map((btn, i) => {
            const rect = btn.getBoundingClientRect();
            const svg = btn.querySelector('svg');

            return {
                type: 'button',
                index: i,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                text: (btn.innerText || '').trim().substring(0, 50) || '(empty)',
                ariaLabel: btn.getAttribute('aria-label') || '',
                title: btn.getAttribute('title') || '',
                svgClasses: getCls(svg),
                className: getCls(btn).substring(0, 100),
                visible: btn.offsetParent !== null
            };
        }).filter(b => b.visible);

        return {
            url, title, bodyLen, hasCascade,
            buttons, lucideIcons: allLucideElements
        };
    } catch (e) { const err = /** @type {Error} */ (e);
        return { error: err.toString(), stack: err.stack };
    }
})()`;

        try {
            // 1. Get Frames
            const { frameTree } = await cdpConnection.call("Page.getFrameTree");
            function flattenFrames(node) {
                let list = [{
                    id: node.frame.id,
                    url: node.frame.url,
                    name: node.frame.name,
                    parentId: node.frame.parentId
                }];
                if (node.childFrames) {
                    for (const child of node.childFrames) list = list.concat(flattenFrames(child));
                }
                return list;
            }
            const allFrames = flattenFrames(frameTree);

            // 2. Map Contexts
            const contexts = cdpConnection.contexts.map(c => ({
                id: c.id,
                name: c.name,
                origin: c.origin,
                frameId: c.auxData ? c.auxData.frameId : null,
                isDefault: c.auxData ? c.auxData.isDefault : false
            }));

            // 3. Scan ALL Contexts
            const contextResults = [];
            for (const ctx of contexts) {
                try {
                    const result = await cdpConnection.call("Runtime.evaluate", {
                        expression: EXP,
                        returnByValue: true,
                        contextId: ctx.id
                    });

                    if (result.result?.value) {
                        const val = result.result.value;
                        contextResults.push({
                            contextId: ctx.id,
                            frameId: ctx.frameId,
                            url: val.url,
                            title: val.title,
                            hasCascade: val.hasCascade,
                            buttonCount: val.buttons.length,
                            lucideCount: val.lucideIcons.length,
                            buttons: val.buttons, // Store buttons for analysis
                            lucideIcons: val.lucideIcons
                        });
                    } else if (result.exceptionDetails) {
                        contextResults.push({
                            contextId: ctx.id,
                            frameId: ctx.frameId,
                            error: `Script Exception: ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description || ''} `
                        });
                    } else {
                        contextResults.push({
                            contextId: ctx.id,
                            frameId: ctx.frameId,
                            error: 'No value returned (undefined)'
                        });
                    }
                } catch (e) {
                    contextResults.push({ contextId: ctx.id, error: e.message });
                }
            }

            // 4. Match and Analyze
            const cascadeFrame = allFrames.find(f => f.url.includes('cascade'));
            const matchingContext = contextResults.find(c => c.frameId === cascadeFrame?.id);
            const contentContext = contextResults.sort((a, b) => (b.buttonCount || 0) - (a.buttonCount || 0))[0];

            // Prepare "useful buttons" from the best context
            const bestContext = matchingContext || contentContext;
            const usefulButtons = bestContext ? (bestContext.buttons || []).filter(b =>
                b.ariaLabel?.includes('New Conversation') ||
                b.title?.includes('New Conversation') ||
                b.ariaLabel?.includes('Past Conversations') ||
                b.title?.includes('Past Conversations') ||
                b.ariaLabel?.includes('History')
            ) : [];

            res.json({
                summary: {
                    frameFound: !!cascadeFrame,
                    cascadeFrameId: cascadeFrame?.id,
                    contextFound: !!matchingContext,
                    bestContextId: bestContext?.contextId
                },
                frames: allFrames,
                contexts: contexts,
                scanResults: contextResults.map(c => ({
                    id: c.contextId,
                    frameId: c.frameId,
                    url: c.url,
                    hasCascade: c.hasCascade,
                    buttons: c.buttonCount,
                    error: c.error
                })),
                usefulButtons: usefulButtons,
                bestContextData: bestContext // Full data for the best context
            });

        } catch (e) {
            res.status(500).json({ error: e.message, stack: e.stack });
        }
    });

    // WebSocket connection with Auth check
    wss.on('connection', (ws, req) => {
        // Parse cookies from headers
        const rawCookies = req.headers.cookie || '';
        const parsedCookies = {};
        rawCookies.split(';').forEach(c => {
            const [k, v] = c.trim().split('=');
            if (k && v) {
                try {
                    parsedCookies[k] = decodeURIComponent(v);
                } catch (e) {
                    parsedCookies[k] = v;
                }
            }
        });

        // Verify signed cookie manually
        const signedToken = parsedCookies[AUTH_COOKIE_NAME];
        let isAuthenticated = false;

        // Exempt local Wi-Fi devices from authentication
        if (isLocalRequest(req)) {
            isAuthenticated = true;
        } else if (signedToken) {
            const token = cookieParser.signedCookie(signedToken, COOKIE_SECRET);
            if (token === AUTH_TOKEN) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â« Unauthorized WebSocket connection attempt');
            console.log('Unauthorized WebSocket connection attempt');
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            setTimeout(() => ws.close(), 100);
            return;
        }

        console.log('📱 Client connected (Authenticated)');

        startModelStatusPolling();

        ws.send(JSON.stringify({
            type: 'terminal_state',
            state: terminalManager.getState()
        }));
        ws.send(JSON.stringify({
            type: 'screen_status',
            status: getScreencastStatus()
        }));
        ws.send(JSON.stringify({
            type: 'tunnel_status',
            status: {
                provider: tunnelProvider,
                ...getTunnelStatus()
            }
        }));
        ws.send(JSON.stringify({
            type: 'suggestion_state',
            ...getSuggestionState()
        }));
        ws.send(JSON.stringify({
            type: 'stats_state',
            stats: getStatsState()
        }));
        ws.send(JSON.stringify({
            type: 'quota_state',
            quota: getQuotaState()
        }));
        ws.send(JSON.stringify({
            type: 'timeline_state',
            timeline: getTimelineState()
        }));

        ws.on('close', () => {
            console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â± Client disconnected');
        });
    });

    return { server, wss, app, hasSSL };
}

// Main
async function main() {
    try {
        cdpConnection = await initCDP();
    } catch (e) { const err = /** @type {Error} */ (e);
        console.warn(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â  Initial CDP discovery failed: ${err.message}`);
        console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¡ Start Antigravity with --remote-debugging-port=7800 to connect.');
    }

    try {
        const { server, wss, app, hasSSL } = await createServer();

        // Start background polling (it will now handle reconnections)
        startPolling(wss);

        // Remote Click
        app.post('/remote-click', async (req, res) => {
            const { selector, index, textContent, omniIndex } = req.body;
            if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
            const result = await clickElement(cdpConnection, { selector, index, textContent, omniIndex });
            res.json(result);
        });

        // Multi-Window: List all available CDP targets
        app.get('/cdp-targets', async (req, res) => {
            res.json({
                targets: availableTargets,
                activeTarget: activeTargetId,
                connected: !!cdpConnection
            });
        });

        // Multi-Window: Switch to a different CDP target
        app.post('/select-target', async (req, res) => {
            const { targetId } = req.body;
            if (!targetId) return res.status(400).json({ error: 'targetId required' });

            const target = availableTargets.find(t => t.id === targetId);
            if (!target) return res.status(404).json({ error: 'Target not found. Refresh targets.' });

            try {
                // Close existing connection
                if (cdpConnection?.ws) {
                    await stopScreencast();
                    cdpConnection.ws.close();
                    cdpConnection = null;
                }

                console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Switching to target: ${target.title} (port ${target.port})`);
                cdpConnection = await connectCDP(target.wsUrl);
                activeTargetId = targetId;
                lastSnapshot = null;
                lastSnapshotHash = null;
                console.log(`ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Connected to: ${target.title}`);
                res.json({ success: true, target: target.title });
            } catch (e) { const err = /** @type {Error} */ (e);
                res.status(500).json({ error: `Failed to connect: ${err.message}` });
            }
        });

        // Remote Scroll - sync phone scroll to desktop
        app.post('/remote-scroll', async (req, res) => {
            const { scrollTop, scrollPercent } = req.body;
            if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
            const result = await remoteScroll(cdpConnection, { scrollTop, scrollPercent });
            res.json(result);
        });

        // Get App State
        app.get('/app-state', async (req, res) => {
            if (!cdpConnection) return res.json({ mode: 'Unknown', model: 'Unknown' });
            const result = await getAppState(cdpConnection);
            res.json(result);
        });

        // Start New Chat
        app.post('/new-chat', async (req, res) => {
            if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
            const result = await startNewChat(cdpConnection);
            if (result.success) {
                sessionStats.reset('new-chat');
                sessionStats.logAction('new_chat_started');
                aiSupervisor.clearAssistHistory();
            }
            res.json(result);
        });

        // Get Chat History
        app.get('/chat-history', async (req, res) => {
            if (!cdpConnection) return res.json({ error: 'CDP disconnected', chats: [] });
            const result = await getChatHistory(cdpConnection);
            res.json(result);
        });

        // Select a Chat
        app.post('/select-chat', async (req, res) => {
            const { title } = req.body;
            if (!title) return res.status(400).json({ error: 'Chat title required' });
            if (!cdpConnection) return res.status(503).json({ error: 'CDP disconnected' });
            const result = await selectChat(cdpConnection, title);
            res.json(result);
        });

        // Check if Chat is Open
        app.get('/chat-status', async (req, res) => {
            if (!cdpConnection) return res.json({ hasChat: false, hasMessages: false, editorFound: false });
            const result = await hasChatOpen(cdpConnection);
            res.json(result);
        });

        // Launch a new window
        app.post('/api/launch-window', async (req, res) => {
            try {
                const newPort = await launchAntigravity();
                // We don't automatically connect here; the polling loop will see it 
                // and the user can select it via the UI context menu.
                res.json({ success: true, port: newPort });
            } catch (e) { const err = /** @type {Error} */ (e);
                console.error('Failed to launch new window:', err);
                res.status(500).json({ error: err.message });
            }
        });

        // Kill any existing process on the port before starting
        await killPortProcess(SERVER_PORT);

        // Start server
        const localIP = getLocalIP();
        const protocol = hasSSL ? 'https' : 'http';
        server.listen(SERVER_PORT, '0.0.0.0', () => {
            const url = `${protocol}://${localIP}:${SERVER_PORT}`;
            const ver = VERSION;

            // ANSI 256-color helpers
            const R  = '\x1b[0m';
            const B  = '\x1b[1m';
            const DIM = '\x1b[2m';
            const c1 = '\x1b[38;5;99m';
            const c2 = '\x1b[38;5;135m';
            const c3 = '\x1b[38;5;141m';
            const c4 = '\x1b[38;5;147m';
            const GR = '\x1b[38;5;82m';
            const CY = '\x1b[38;5;81m';
            const WH = '\x1b[38;5;255m';

            const line = `${c1}${B}  ${'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬'.repeat(50)}${R}`;

            console.log('');
            console.log(`${c2}${B}   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â${R}`);
            console.log(`${c2}${B}  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“${R}`);
            console.log(`${c3}${B}  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“${R}`);
            console.log(`${c3}${B}  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“${R}`);
            console.log(`${c4}${B}  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“${R}`);
            console.log(`${c4}${B}   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â     ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â${R}`);
            console.log('');
            console.log(`  ${WH}${B}Antigravity Remote Chat${R}  ${DIM}v${ver}${R}`);
            console.log(`  ${DIM}Mobile remote control for AI sessions${R}`);
            console.log('');
            console.log(line);
            console.log('');
            console.log(`  ${GR}${B}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¸${R} ${WH}${B}Server${R}     ${CY}${url}${R}`);
            console.log(`  ${GR}${B}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¸${R} ${WH}${B}Protocol${R}   ${hasSSL ? `${GR}HTTPS ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢` : 'HTTP'}${R}`);
            console.log(`  ${GR}${B}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¸${R} ${WH}${B}CDP${R}        ${DIM}ports 7800-7803${R}`);
            console.log(`  ${GR}${B}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¸${R} ${WH}${B}Workspace${R}  ${DIM}${workspaceRoot}${R}`);
            console.log('');
            console.log(line);
            console.log('');
            console.log(`  ${DIM}ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â± Open this URL on your phone${R}`);
            console.log(`  ${DIM}ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂªÃƒâ€¦Ã‚Â¸ Multi-window switching supported${R}`);
            console.log(`  ${DIM}ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¹  Press Ctrl+C to stop${R}`);
            console.log('');

            maybeStartAutoTunnel({ tls: hasSSL, sniServerName: '127.0.0.1' });

            // Initialize Telegram bot with interactive commands
            initTelegramBot().then(active => {
                if (active) {
                    console.log(`  ${GR}${B}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¸${R} ${WH}${B}Telegram${R}   ${GR}Bot active ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦${R}`);
                    registerTelegramHooks({
                        onApprove: async () => {
                            const pendingSuggestion = getLatestPendingSuggestion();
                            if (pendingSuggestion) {
                                return approveQueuedSuggestion(pendingSuggestion.id);
                            }
                            return cdpConnection ? completePendingAction(cdpConnection, 'accept') : { error: 'No CDP' };
                        },
                        onReject: async () => {
                            const pendingSuggestion = getLatestPendingSuggestion();
                            if (pendingSuggestion) {
                                return rejectQueuedSuggestion(pendingSuggestion.id);
                            }
                            return cdpConnection ? completePendingAction(cdpConnection, 'reject') : { error: 'No CDP' };
                        },
                        onStatus: () => ({
                            cdpConnected: !!(cdpConnection?.ws?.readyState === WebSocket.OPEN),
                            supervisorEnabled: aiSupervisor.enabled,
                            suggestMode: aiSupervisor.isSuggestModeEnabled(),
                            pendingSuggestions: suggestQueue.getPendingCount(),
                            model: 'via /app-state',
                            mode: 'via /app-state',
                            targetsCount: availableTargets.length,
                            uptime: process.uptime() > 3600
                                ? `${Math.floor(process.uptime()/3600)}h ${Math.floor((process.uptime()%3600)/60)}m`
                                : `${Math.floor(process.uptime()/60)}m`
                        }),
                        onStats: () => getStatsState(),
                        onQuota: () => quotaService.refresh(),
                        onScreenshot: async () => {
                            const result = await captureCurrentScreenshot({
                                format: 'jpeg',
                                quality: 70
                            });
                            if (!result.success) {
                                return { data: null };
                            }
                            sessionStats.increment('screenCaptures');
                            sessionStats.logAction('screenshot_captured');
                            return { data: result.data };
                        },
                        onSuggestionApprove: (id) => approveQueuedSuggestion(id),
                        onSuggestionReject: (id) => rejectQueuedSuggestion(id)
                    });
                }
            }).catch(() => {});
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            console.log(`\nÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ Received ${signal}. Shutting down gracefully...`);
            await stopScreencast();
            screenshotTimeline.stop();
            await Promise.all(Object.values(tunnelManagers).map((manager) => manager.stop()));
            await stopTelegramBot();
            wss.close(() => {
                console.log('   WebSocket server closed');
            });
            server.close(() => {
                console.log('   HTTP server closed');
            });
            if (cdpConnection?.ws) {
                cdpConnection.ws.close();
                console.log('   CDP connection closed');
            }
            setTimeout(() => process.exit(0), 1000);
        };

        process.on('SIGINT', () => { gracefulShutdown('SIGINT'); });
        process.on('SIGTERM', () => { gracefulShutdown('SIGTERM'); });

    } catch (e) { const err = /** @type {Error} */ (e);
        console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Fatal error:', err.message);
        process.exit(1);
    }
}

main();




