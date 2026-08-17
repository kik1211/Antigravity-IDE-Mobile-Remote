import { describe, expect, it } from 'vitest';
import {
  QuotaService,
  buildQuotaBar,
  normalizeModelName,
  normalizeQuotaPayload,
  parseLanguageServerCommand,
} from '../../src/quota-service.js';

const SAMPLE_PAYLOAD = {
  userStatus: {
    name: 'Ken Hua',
    email: 'ken@example.com',
    planStatus: {
      availablePromptCredits: 500,
      availableFlowCredits: 100,
      planInfo: {
        planName: 'Pro',
        teamsTier: 'TEAMS_TIER_PRO',
        monthlyPromptCredits: 50000,
        monthlyFlowCredits: 150000,
      },
    },
    cascadeModelConfigData: {
      clientModelConfigs: [
        {
          label: 'Claude Sonnet 4.6 (Thinking)',
          modelOrAlias: { model: 'MODEL_PLACEHOLDER_M35' },
          quotaInfo: {
            remainingFraction: 0.2,
            resetTime: '2026-03-29T12:27:56Z',
          },
        },
        {
          label: 'Gemini 3.1 Pro (High)',
          modelOrAlias: { model: 'MODEL_PLACEHOLDER_M37' },
          quotaInfo: {
            remainingFraction: 0.8,
            resetTime: '2026-03-29T12:26:29Z',
          },
        },
      ],
    },
  },
};

describe('quota-service helpers', () => {
  it('parses language server command flags from a process command line', () => {
    const parsed = parseLanguageServerCommand(
      '1598468 /usr/share/antigravity/language_server_linux_x64 --csrf_token abc --extension_server_port 41573 --extension_server_csrf_token ext-123 --workspace_id file_home_repo'
    );

    expect(parsed.pid).toBe(1598468);
    expect(parsed.csrfToken).toBe('abc');
    expect(parsed.extensionServerPort).toBe(41573);
    expect(parsed.extensionServerCsrfToken).toBe('ext-123');
    expect(parsed.workspaceId).toBe('file_home_repo');
  });

  it('builds unicode bars from usage percentages', () => {
    expect(buildQuotaBar(80)).toBe('▓▓▓▓▓▓▓▓░░');
    expect(buildQuotaBar(25, 8)).toBe('▓▓░░░░░░');
  });

  it('prefers explicit labels and otherwise maps internal model ids', () => {
    expect(normalizeModelName('MODEL_PLACEHOLDER_M35')).toBe(
      'Claude Sonnet 4.6 (Thinking)'
    );
    expect(normalizeModelName('MODEL_X', 'Custom Label')).toBe('Custom Label');
  });

  it('normalizes the raw quota payload into UI-ready model summaries', () => {
    const summary = normalizeQuotaPayload(SAMPLE_PAYLOAD, {
      enabled: true,
      pid: 123,
      port: 46505,
      workspaceId: 'file_home_repo',
    });

    expect(summary.available).toBe(true);
    expect(summary.totalModels).toBe(2);
    expect(summary.criticalModels).toBe(1);
    expect(summary.models[0].name).toBe('Claude Sonnet 4.6 (Thinking)');
    expect(summary.models[0].usagePercent).toBe(80);
    expect(summary.models[0].status).toBe('critical');
    expect(summary.credits.prompt.usagePercent).toBe(99);
  });
});

describe('QuotaService', () => {
  it('tracks new critical alerts only once per reset window', () => {
    const service = new QuotaService();
    const alerts = service.updateAlerts([
      {
        id: 'model-a',
        resetTime: '2026-03-29T12:27:56Z',
        usagePercent: 85,
      },
    ]);
    const duplicateAlerts = service.updateAlerts([
      {
        id: 'model-a',
        resetTime: '2026-03-29T12:27:56Z',
        usagePercent: 85,
      },
    ]);

    expect(alerts).toHaveLength(1);
    expect(duplicateAlerts).toHaveLength(0);
  });

  it('refreshes successfully when discovery and probing succeed', async () => {
    class TestQuotaService extends QuotaService { async extractQuotaViaCDP() { return null; } async discoverCandidates() {
        return [{ pid: 1, ports: [46505], csrfToken: 'token', workspaceId: 'ws' }];
      }

      async probeCandidate() {
        return {
          payload: SAMPLE_PAYLOAD,
          pid: 1,
          port: 46505,
          workspaceId: 'ws',
        };
      }
    }

    const service = new TestQuotaService();
    const summary = await service.refresh({ emit: false });

    expect(summary.available).toBe(true);
    expect(summary.models[0].usagePercent).toBe(80);
    expect(summary.workspaceId).toBe('ws');
  });

  it('returns an unavailable summary when discovery fails', async () => {
    class TestQuotaService extends QuotaService { async extractQuotaViaCDP() { return null; } async discoverCandidates() {
        throw new Error('No Antigravity language server process found');
      }
    }

    const service = new TestQuotaService();
    const summary = await service.refresh({ emit: false });

    expect(summary.available).toBe(false);
    expect(summary.error).toContain('No Antigravity language server process found');
  });
});
