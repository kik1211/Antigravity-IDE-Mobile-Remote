// @ts-check
/**
 * Model quota service backed by the local Antigravity language server.
 *
 * The service discovers running language_server processes, probes their HTTPS
 * status endpoint, normalizes the quota payload, and caches the latest result
 * for the mobile UI, Telegram, and background alerts.
 *
 * @module quota-service
 */

import fs from 'fs/promises';
import https from 'https';
import os from 'os';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { getQuotaEnabled, getQuotaPollInterval } from './config.js';
import { initCDP } from './cdp/connection.js';
import WebSocket from 'ws';

const execFileAsync = promisify(execFile);
const API_ENDPOINT =
  '/exa.language_server_pb.LanguageServerService/GetUserStatus';
const CSRF_HEADER = 'x-codeium-csrf-token';
const REQUEST_TIMEOUT_MS = 4000;

export const MODEL_NAMES = {
  MODEL_PLACEHOLDER_M12: 'Claude Opus 4.6',
  MODEL_PLACEHOLDER_M18: 'Gemini 3 Flash',
  MODEL_PLACEHOLDER_M26: 'Claude Opus 4.6 (Thinking)',
  MODEL_PLACEHOLDER_M35: 'Claude Sonnet 4.6 (Thinking)',
  MODEL_PLACEHOLDER_M36: 'Gemini 3.1 Pro (Low)',
  MODEL_PLACEHOLDER_M37: 'Gemini 3.1 Pro (High)',
  MODEL_PLACEHOLDER_M47: 'Gemini 3 Flash',
  MODEL_CLAUDE_4_5_SONNET: 'Claude Sonnet 4.6',
  MODEL_CLAUDE_4_5_SONNET_THINKING: 'Claude Sonnet 4.6 (Thinking)',
  MODEL_OPENAI_GPT_OSS_120B_MEDIUM: 'GPT-OSS 120B (Medium)',
};

function clampPercentage(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildStatusLabel(usagePercent) {
  if (usagePercent >= 80) return 'critical';
  if (usagePercent >= 60) return 'warning';
  return 'ok';
}

export function buildQuotaBar(usagePercent, width = 10) {
  const safeWidth = Math.max(1, width);
  const safePercent = clampPercentage(usagePercent);
  const filled = Math.round((safePercent / 100) * safeWidth);
  return `${'▓'.repeat(filled)}${'░'.repeat(safeWidth - filled)}`;
}

export function normalizeModelName(modelId, fallbackLabel = '') {
  if (fallbackLabel) return fallbackLabel;
  if (MODEL_NAMES[modelId]) return MODEL_NAMES[modelId];
  return String(modelId || 'Unknown model')
    .replace(/^MODEL_/, '')
    .replaceAll('_', ' ')
    .trim();
}

function readFlagValue(commandLine, flag) {
  const match = String(commandLine || '').match(
    new RegExp(`(?:^|\\s)${flag}\\s+([^\\s]+)`)
  );
  return match ? match[1] : '';
}

export function parseLanguageServerCommand(commandLine) {
  const command = String(commandLine || '').trim();
  const pidMatch = command.match(/^\s*(\d+)\s+/);
  const pid = pidMatch ? Number.parseInt(pidMatch[1], 10) : NaN;
  const line = pidMatch ? command.slice(pidMatch[0].length) : command;

  return {
    pid: Number.isFinite(pid) ? pid : null,
    commandLine: line,
    csrfToken: readFlagValue(line, '--csrf_token'),
    extensionServerPort: asNumber(
      readFlagValue(line, '--extension_server_port'),
      0
    ),
    extensionServerCsrfToken: readFlagValue(line, '--extension_server_csrf_token'),
    workspaceId: readFlagValue(line, '--workspace_id'),
    appDataDir: readFlagValue(line, '--app_data_dir'),
  };
}

function parseListeningPort(line) {
  const match = String(line).match(/:(\d+)\s+/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function listProcessesLinux() {
  const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,args=']);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /language_server/i.test(line))
    .map((line) => parseLanguageServerCommand(line))
    .filter((entry) => entry.pid);
}

async function listProcessesWindows() {
  const script = [
    '$items = Get-CimInstance Win32_Process |',
    "  Where-Object { $_.CommandLine -match 'language_server' } |",
    '  Select-Object ProcessId, CommandLine',
    '$items | ConvertTo-Json -Compress',
  ].join('\n');
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile',
    '-Command',
    script,
  ]);
  if (!stdout.trim()) return [];
  const payload = JSON.parse(stdout);
  const items = Array.isArray(payload) ? payload : [payload];
  return items.map((item) =>
    parseLanguageServerCommand(`${item.ProcessId || ''} ${item.CommandLine || ''}`)
  );
}

export async function discoverLanguageServerProcesses() {
  if (process.platform === 'win32') {
    return listProcessesWindows();
  }
  return listProcessesLinux();
}

async function getListeningPortsForPid(pid) {
  if (!pid) return [];

  if (process.platform === 'win32') {
    const script = [
      `try {`,
      `  $ports = Get-NetTCPConnection -OwningProcess ${pid} -State Listen -ErrorAction Stop | Select-Object -ExpandProperty LocalPort`,
      `  $ports | ConvertTo-Json -Compress`,
      `} catch {`,
      `  '[]'`,
      `}`
    ].join('\n');
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      script,
    ]);
    if (!stdout.trim()) return [];
    const payload = JSON.parse(stdout);
    const ports = (Array.isArray(payload) ? payload : [payload]).map((value) =>
      Number.parseInt(String(value), 10)
    );
    return [...new Set(ports.filter(Number.isFinite))].sort((a, b) => a - b);
  }

  let ports = [];

  try {
    const { stdout } = await execFileAsync('ss', ['-ltnp']);
    ports = stdout
      .split('\n')
      .filter((line) => line.includes(`pid=${pid}`))
      .map((line) => parseListeningPort(line))
      .filter((value) => Number.isFinite(value));
  } catch (_) {
    const { stdout } = await execFileAsync('lsof', [
      '-Pan',
      '-p',
      String(pid),
      '-iTCP',
      '-sTCP:LISTEN',
    ]);
    ports = stdout
      .split('\n')
      .map((line) => parseListeningPort(line))
      .filter((value) => Number.isFinite(value));
  }

  return [...new Set(ports)].sort((a, b) => a - b);
}

export function getCsrfTokenCandidatePaths() {
  return [
    join(os.homedir(), '.antigravity', 'data', 'machineid'),
    join(os.homedir(), '.config', 'Antigravity', 'User', 'machineid'),
    join(os.homedir(), 'AppData', 'Roaming', 'Antigravity', 'User', 'machineid'),
  ];
}

export async function extractFallbackCsrfToken() {
  for (const filePath of getCsrfTokenCandidatePaths()) {
    try {
      const value = await fs.readFile(filePath, 'utf8');
      const token = value.trim();
      if (token) return token;
    } catch (_) {
      // Ignore missing files and keep scanning.
    }
  }

  return '';
}

export async function fetchQuotaPayload(port, csrfToken) {
  const payload = JSON.stringify({});

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        path: API_ENDPOINT,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          [CSRF_HEADER]: csrfToken,
        },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if ((response.statusCode || 500) >= 400) {
            const error = new Error(
              `Quota request failed (${response.statusCode}): ${body || 'No response body'}`
            );
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body || '{}'));
          } catch (error) {
            reject(
              new Error(
                `Quota response could not be parsed as JSON: ${error.message}`
              )
            );
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error('Quota request timed out'));
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function normalizeCreditBucket(label, available, monthly) {
  const max = asNumber(monthly, 0);
  const remaining = asNumber(available, 0);
  if (max <= 0) return null;
  const used = Math.max(0, max - remaining);
  const usagePercent = clampPercentage(Math.round((used / max) * 100));
  return {
    label,
    available: remaining,
    monthly: max,
    used,
    usagePercent,
    remainingPercent: clampPercentage(100 - usagePercent),
  };
}

export function normalizeQuotaPayload(payload, meta = {}) {
  const now = new Date().toISOString();
  const userStatus = payload?.userStatus || {};
  const planStatus = userStatus.planStatus || {};
  const planInfo = planStatus.planInfo || {};
  const cascadeData = userStatus.cascadeModelConfigData || {};
  const modelConfigs = Array.isArray(cascadeData.clientModelConfigs)
    ? cascadeData.clientModelConfigs
    : [];

  const models = modelConfigs
    .map((config) => {
      const quotaInfo = config?.quotaInfo || {};
      const rawModelId =
        config?.modelOrAlias?.model ||
        config?.modelOrAlias?.alias ||
        config?.label ||
        'UNKNOWN_MODEL';
      const remainingFraction = Math.max(
        0,
        Math.min(1, asNumber(quotaInfo.remainingFraction, 1))
      );
      const remainingPercent = clampPercentage(
        Math.round(remainingFraction * 100)
      );
      const usagePercent = clampPercentage(100 - remainingPercent);
      const label = normalizeModelName(rawModelId, config?.label || '');

      return {
        id: rawModelId,
        name: label,
        label,
        usagePercent,
        remainingPercent,
        used: usagePercent,
        limit: 100,
        status: buildStatusLabel(usagePercent),
        resetTime: quotaInfo.resetTime || '',
        recommended: Boolean(config?.isRecommended),
        supportsImages: Boolean(config?.supportsImages),
        bar: buildQuotaBar(usagePercent),
      };
    })
    .sort((left, right) => right.usagePercent - left.usagePercent);

  const criticalModels = models.filter(
    (model) => model.status === 'critical'
  ).length;
  const warningModels = models.filter(
    (model) => model.status === 'warning'
  ).length;
  const promptCredits = normalizeCreditBucket(
    'Prompt credits',
    planStatus.availablePromptCredits,
    planInfo.monthlyPromptCredits
  );
  const flowCredits = normalizeCreditBucket(
    'Flow credits',
    planStatus.availableFlowCredits,
    planInfo.monthlyFlowCredits
  );

  const selectableModels = modelConfigs.map((config) => {
    const rawModelId =
      config?.modelOrAlias?.model ||
      config?.modelOrAlias?.alias ||
      config?.label ||
      'UNKNOWN_MODEL';
    const label = normalizeModelName(rawModelId, config?.label || '');
    return {
      value: label,
      label,
      id: rawModelId,
      recommended: Boolean(config?.isRecommended),
      supportsImages: Boolean(config?.supportsImages)
    };
  });

  return {
    enabled: Boolean(meta.enabled),
    available: true,
    source: 'language-server',
    pid: meta.pid || null,
    port: meta.port || null,
    workspaceId: meta.workspaceId || '',
    user: {
      name: userStatus.name || '',
      email: userStatus.email || '',
      planName: planInfo.planName || '',
      teamTier: planInfo.teamsTier || '',
    },
    credits: {
      prompt: promptCredits,
      flow: flowCredits,
    },
    models,
    selectableModels,
    totalModels: models.length,
    criticalModels,
    warningModels,
    highestUsagePercent: models[0]?.usagePercent || 0,
    lastUpdated: now,
    alerts: [],
    error: '',
  };
}

function buildUnavailableSummary(error = 'Quota service unavailable') {
  return {
    enabled: getQuotaEnabled(),
    available: false,
    source: 'language-server',
    pid: null,
    port: null,
    workspaceId: '',
    user: {
      name: '',
      email: '',
      planName: '',
      teamTier: '',
    },
    credits: {
      prompt: null,
      flow: null,
    },
    models: [],
    selectableModels: [],
    totalModels: 0,
    criticalModels: 0,
    warningModels: 0,
    highestUsagePercent: 0,
    lastUpdated: new Date().toISOString(),
    alerts: [],
    error,
  };
}

export class QuotaService {
  constructor() {
    this.listeners = new Set();
    this.pollTimer = null;
    this.lastSummary = buildUnavailableSummary('Quota data not fetched yet');
    this.alertedModelKeys = new Set();
    this.refreshInFlight = null;
    this.cdpRefreshInFlight = null;
  }

  isEnabled() {
    return getQuotaEnabled();
  }

  getPollInterval() {
    return getQuotaPollInterval();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (_) {
        // Quota listeners must never break the main process.
      }
    }
  }

  getSummary() {
    return {
      ...this.lastSummary,
      alerts: Array.isArray(this.lastSummary.alerts)
        ? this.lastSummary.alerts.map((alert) => ({ ...alert }))
        : [],
      models: Array.isArray(this.lastSummary.models)
        ? this.lastSummary.models.map((model) => ({ ...model }))
        : [],
      enabled: this.isEnabled(),
      pollIntervalMs: this.getPollInterval(),
    };
  }

  updateAlerts(models) {
    const nextKeys = new Set();
    const freshAlerts = [];

    for (const model of models) {
      if (model.usagePercent < 80) continue;
      const key = `${model.id}:${model.resetTime || 'unknown'}`;
      nextKeys.add(key);
      if (!this.alertedModelKeys.has(key)) {
        freshAlerts.push(model);
      }
    }

    this.alertedModelKeys = nextKeys;
    return freshAlerts;
  }

  async discoverCandidates() {
    const processes = await discoverLanguageServerProcesses();
    if (!processes.length) {
      throw new Error('No Antigravity language server process found');
    }

    const fallbackToken = await extractFallbackCsrfToken();
    const candidates = [];

    for (const processEntry of processes) {
      const listeningPorts = await getListeningPortsForPid(processEntry.pid);
      const candidatePorts = [
        ...new Set(
          [processEntry.extensionServerPort, ...listeningPorts].filter(
            (port) => Number.isFinite(port) && port > 0
          )
        ),
      ];

      if (!candidatePorts.length) continue;

      candidates.push({
        ...processEntry,
        csrfToken: processEntry.csrfToken || fallbackToken,
        ports: candidatePorts,
      });
    }

    if (!candidates.length) {
      throw new Error('No reachable language server ports found');
    }

    return candidates;
  }

  async probeCandidate(candidate) {
    let lastError = null;

    for (const port of candidate.ports) {
      try {
        const payload = await fetchQuotaPayload(port, candidate.csrfToken);
        return {
          payload,
          pid: candidate.pid,
          port,
          workspaceId: candidate.workspaceId,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No quota endpoint responded');
  }

  
  async extractQuotaViaCDP(explicitRequest = false) {
    if (this.cdpRefreshInFlight) return this.cdpRefreshInFlight;

    this.cdpRefreshInFlight = (async () => {
      let ws = null;
      try {
        const mainCdp = await initCDP();
        
        let res = await fetch('http://127.0.0.1:7800/json/list').catch(() => null);
        if (!res) throw new Error("CDP endpoint not reachable");
        let targets = await res.json();
        let settingsTarget = targets.find(t => t.title === 'Settings' || (t.url && t.url.includes('settings')));
        
        let wasSettingsOpen = !!settingsTarget;
        
        if (!wasSettingsOpen) {
            // Open settings via command palette
            await mainCdp.call('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 112, nativeVirtualKeyCode: 112 }); 
            await mainCdp.call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 112, nativeVirtualKeyCode: 112 });
            await new Promise(r => setTimeout(r, 600));
            const text = "Open Antigravity IDE User Settings";
            for (let i = 0; i < text.length; i++) {
                await mainCdp.call('Input.dispatchKeyEvent', { type: 'char', text: text[i] });
                await new Promise(r => setTimeout(r, 5));
            }
            await new Promise(r => setTimeout(r, 600));
            await mainCdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter' });
            await mainCdp.call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter' });
            
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 500));
                res = await fetch('http://127.0.0.1:7800/json/list').catch(() => null);
                if (res) {
                    targets = await res.json();
                    settingsTarget = targets.find(t => t.title === 'Settings' || (t.url && t.url.includes('settings')));
                    if (settingsTarget) break;
                }
            }
        }
        
        if (!settingsTarget) {
            return { available: false, error: "Settings target failed to load." };
        }
        
        ws = new WebSocket(settingsTarget.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
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
        await sendCommand('DOM.enable');
        
        const activeTabRes = await sendCommand('Runtime.evaluate', {
            expression: `(function() {
                // Find selected tab by looking for the one with highest visual weight or aria-selected
                const buttons = Array.from(document.querySelectorAll('button, [role="tab"], .settings-tab'));
                const active = buttons.find(b => b.getAttribute('aria-selected') === 'true' || b.className.includes('bg-sidebar-secondary'));
                return active ? (active.innerText || active.textContent).trim() : 'Unknown';
            })()`,
            returnByValue: true
        });
        const originalTab = activeTabRes.result?.value || 'Unknown';
        
        // Function to click a button via Input API
        const clickButton = async (textMatch) => {
            const r = await sendCommand('Runtime.evaluate', {
                expression: `(function(){
                    const buttons = Array.from(document.querySelectorAll('button, [role="tab"], .settings-tab'));
                    const b = buttons.find(b => (b.innerText || b.textContent || '').trim().toLowerCase() === '${textMatch.toLowerCase()}');
                    if(!b) return null;
                    const rect = b.getBoundingClientRect();
                    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
                })()`,
                returnByValue: true
            });
            if (r.result.value) {
                const {x, y} = r.result.value;
                await sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
                await sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            }
        };

        // Refresh lifecycle: click General (if not on Models, or even if on Models to force refresh)
        await clickButton('General');
        await new Promise(r => setTimeout(r, 1000));
        
        // Click Models
        await clickButton('Models');
        // Wait for render
        await new Promise(r => setTimeout(r, 2000));
        
        const resObj = await sendCommand('Runtime.evaluate', {
            expression: `(async () => {
                const result = {
                    available: true,
                    gemini: { weeklyRemaining: null, fiveHourRemaining: null },
                    claudeGpt: { weeklyRemaining: null, fiveHourRemaining: null },
                    updatedAt: new Date().toISOString()
                };
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let texts = [];
                let node;
                while (node = walker.nextNode()) {
                    const text = node.nodeValue.trim();
                    if (text) texts.push(text);
                }
                const geminiIdx = texts.findIndex(t => t.toLowerCase().includes('gemini models'));
                const claudeIdx = texts.findIndex(t => t.toLowerCase().includes('claude and gpt'));
                function parseSection(startIdx, endIdx, dest) {
                    if (startIdx === -1) return;
                    const section = texts.slice(startIdx, endIdx === -1 ? undefined : endIdx);
                    
                    const wIdx = section.findIndex(t => t.includes('Weekly Limit Remaining'));
                    if (wIdx !== -1) {
                        // Scan forward from wIdx to find percentage
                        for(let i = 1; i <= 4; i++) {
                            if (wIdx + i < section.length && section[wIdx + i].includes('%')) {
                                dest.weeklyRemaining = parseInt(section[wIdx + i].replace('%', ''), 10);
                                // The text node BEFORE the percentage is the reset text, if it's not the label itself
                                if (i > 1) {
                                    dest.weeklyResetText = section[wIdx + i - 1];
                                }
                                break;
                            }
                        }
                    }
                    const fIdx = section.findIndex(t => t.includes('Five Hour Limit Remaining'));
                    if (fIdx !== -1) {
                        for(let i = 1; i <= 4; i++) {
                            if (fIdx + i < section.length && section[fIdx + i].includes('%')) {
                                dest.fiveHourRemaining = parseInt(section[fIdx + i].replace('%', ''), 10);
                                if (i > 1) {
                                    dest.fiveHourResetText = section[fIdx + i - 1];
                                }
                                break;
                            }
                        }
                    }
                }
                parseSection(geminiIdx, claudeIdx, result.gemini);
                parseSection(claudeIdx, -1, result.claudeGpt);
                return result;
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        
        // Restore tab
        if (originalTab !== 'Models' && originalTab !== 'Unknown') {
            await clickButton(originalTab);
            await new Promise(r => setTimeout(r, 800));
        }
        
        return resObj.result?.value || { available: false, error: 'Could not extract quota values.' };
      } catch (err) {
        return { available: false, error: err.message };
      } finally {
        if (ws) ws.close();
        this.cdpRefreshInFlight = null;
      }
    })();
    return this.cdpRefreshInFlight;
  }

  async refresh(options = {}) {
    const { emit = true } = options;
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      try {
        const candidates = await this.discoverCandidates();
        let lastError = null;

        let cdpValues = null;
        try {
            cdpValues = await this.extractQuotaViaCDP(options.explicit);
        } catch (err) {
            // CDP might fail or skip if not explicitly requested
        }

        for (const candidate of candidates) {
          try {
            const result = await this.probeCandidate(candidate);
            const summary = normalizeQuotaPayload(result.payload, {
              enabled: this.isEnabled(),
              pid: result.pid,
              port: result.port,
              workspaceId: result.workspaceId,
            });
            
            summary.alerts = this.updateAlerts(summary.models);
            
            if (cdpValues && cdpValues.gemini) {
                summary.cdpGemini = cdpValues.gemini;
                summary.cdpClaudeGpt = cdpValues.claudeGpt;
                summary.cdpAvailable = true;
                summary.cdpUpdatedAt = new Date().toISOString();
            } else if (this.lastSummary && this.lastSummary.cdpAvailable) {
                summary.cdpGemini = this.lastSummary.cdpGemini;
                summary.cdpClaudeGpt = this.lastSummary.cdpClaudeGpt;
                summary.cdpAvailable = true;
                summary.cdpUpdatedAt = this.lastSummary.cdpUpdatedAt;
            } else {
                summary.cdpAvailable = false;
            }

            this.lastSummary = summary;
            if (emit) {
              this.emit('updated', this.getSummary());
            }
            return this.getSummary();
          } catch (error) {
            lastError = error;
          }
        }

        throw lastError || new Error('No quota endpoint responded');
      } catch (error) {
        this.alertedModelKeys.clear();
        this.lastSummary = buildUnavailableSummary(error.message);
        if (emit) {
          this.emit('error', this.getSummary());
        }
        return this.getSummary();
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  start() {
    if (this.pollTimer || !this.isEnabled()) return;

    this.refresh().catch(() => {});
    this.pollTimer = setInterval(() => {
      this.refresh().catch(() => {});
    }, this.getPollInterval());

    if (typeof this.pollTimer.unref === 'function') {
      this.pollTimer.unref();
    }
  }

  stop() {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
}

export const quotaService = new QuotaService();
