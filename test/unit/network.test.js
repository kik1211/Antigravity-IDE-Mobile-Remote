import http from 'http';
import os from 'os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJson, getLocalIP, isLocalRequest } from '../../src/utils/network.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('network utils', () => {
  it('prefers a 192.168.x.x address over docker-style 172.x.x.x ranges', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0: [{ family: 'IPv4', internal: false, address: '172.18.0.5' }],
      wlan0: [{ family: 'IPv4', internal: false, address: '192.168.0.22' }],
    });

    expect(getLocalIP()).toBe('192.168.0.22');
  });

  it('returns localhost when no external IPv4 address exists', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    });

    expect(getLocalIP()).toBe('localhost');
  });

  it('treats forwarded requests as non-local', () => {
    expect(
      isLocalRequest({
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '192.168.1.50',
        socket: { remoteAddress: '192.168.1.50' },
      })
    ).toBe(false);
  });

  it('accepts local network addresses and rejects public addresses', () => {
    expect(
      isLocalRequest({
        headers: {},
        ip: '10.0.0.14',
        socket: { remoteAddress: '10.0.0.14' },
      })
    ).toBe(true);

    expect(
      isLocalRequest({
        headers: {},
        ip: '8.8.8.8',
        socket: { remoteAddress: '8.8.8.8' },
      })
    ).toBe(false);
  });

  it('fetches and parses JSON without extra dependencies', async () => {
    const server = http.createServer((req, res) => {
      void req;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, source: 'test-server' }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const result = await getJson(`http://127.0.0.1:${port}`);
      expect(result).toEqual({ ok: true, source: 'test-server' });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
