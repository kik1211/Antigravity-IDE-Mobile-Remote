import { afterEach, describe, expect, it } from 'vitest';
import { importFresh } from './import-fresh.js';

const ENV_KEYS = [
  'PORT',
  'APP_PASSWORD',
  'WORKSPACE_ROOT',
  'AUTO_TUNNEL_PROVIDER',
  'SUPERVISOR_SUGGEST_MODE',
  'SUPERVISOR_MAX_QUEUE',
  'QUOTA_ENABLED',
  'QUOTA_POLL_INTERVAL',
  'SCREENSHOT_ENABLED',
  'SCREENSHOT_INTERVAL',
  'SCREENSHOT_MAX',
];

const ENV_SNAPSHOT = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const original = ENV_SNAPSHOT.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}

async function loadConfig(overrides = {}) {
  restoreEnv();
  for (const key of ENV_KEYS) {
    if (!(key in overrides)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, overrides);
  return importFresh('../../src/config.js', import.meta.url);
}

afterEach(() => {
  restoreEnv();
});

describe('config module', () => {
  it('uses 4747 as the default server port', async () => {
    const { SERVER_PORT } = await loadConfig();
    expect(SERVER_PORT).toBe(4747);
  });

  it('reads the server port from the environment', async () => {
    const { SERVER_PORT } = await loadConfig({ PORT: '5151' });
    expect(SERVER_PORT).toBe('5151');
  });

  it('falls back to the default app password', async () => {
    const { APP_PASSWORD } = await loadConfig();
    expect(APP_PASSWORD).toBe('antigravity');
  });

  it('reads the workspace root override from the environment', async () => {
    const { WORKSPACE_ROOT } = await loadConfig({
      WORKSPACE_ROOT: '/tmp/omni-workspace',
    });
    expect(WORKSPACE_ROOT).toBe('/tmp/omni-workspace');
  });

  it('normalizes the auto tunnel provider to lowercase', async () => {
    const { AUTO_TUNNEL_PROVIDER } = await loadConfig({
      AUTO_TUNNEL_PROVIDER: 'NgRoK',
    });
    expect(AUTO_TUNNEL_PROVIDER).toBe('ngrok');
  });

  it('enables suggest mode when the env flag is truthy', async () => {
    const { getSupervisorSuggestMode } = await loadConfig({
      SUPERVISOR_SUGGEST_MODE: 'true',
    });
    expect(getSupervisorSuggestMode()).toBe(true);
  });

  it('uses the configured max queue size when valid', async () => {
    const { getSupervisorMaxQueue } = await loadConfig({
      SUPERVISOR_MAX_QUEUE: '12',
    });
    expect(getSupervisorMaxQueue()).toBe(12);
  });

  it('falls back to the default queue size when the env value is invalid', async () => {
    const { getSupervisorMaxQueue } = await loadConfig({
      SUPERVISOR_MAX_QUEUE: '-3',
    });
    expect(getSupervisorMaxQueue()).toBe(10);
  });

  it('reads the quota service flags and interval', async () => {
    const { getQuotaEnabled, getQuotaPollInterval } = await loadConfig({
      QUOTA_ENABLED: 'on',
      QUOTA_POLL_INTERVAL: '90000',
    });
    expect(getQuotaEnabled()).toBe(true);
    expect(getQuotaPollInterval()).toBe(90000);
  });

  it('reads screenshot settings from the environment', async () => {
    const {
      getScreenshotEnabled,
      getScreenshotInterval,
      getScreenshotMax,
    } = await loadConfig({
      SCREENSHOT_ENABLED: 'yes',
      SCREENSHOT_INTERVAL: '45000',
      SCREENSHOT_MAX: '24',
    });
    expect(getScreenshotEnabled()).toBe(true);
    expect(getScreenshotInterval()).toBe(45000);
    expect(getScreenshotMax()).toBe(24);
  });

  it('exports stable platform constants', async () => {
    const { PORTS, CONTAINER_IDS, VERSION } = await loadConfig();
    expect(PORTS).toEqual([7800, 7801, 7802, 7803]);
    expect(CONTAINER_IDS[0]).toBe('cascade');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
