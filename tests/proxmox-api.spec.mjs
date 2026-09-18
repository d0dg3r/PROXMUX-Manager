import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const modulePath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../lib/proxmox-api.js'
);
const moduleSource = fs.readFileSync(modulePath, 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource, 'utf8').toString('base64')}`;
const mod = await import(moduleUrl);

const { formatGuestOsType, categorizeConnectionError, ProxmoxAPI, buildFailoverUrlList, deriveFailoverHostname } = mod;

test('formats l26 ostype for UI display', async () => {
  expect(formatGuestOsType('l26')).toBe('Linux 2.6+');
});

test('keeps unknown ostype unchanged', async () => {
  expect(formatGuestOsType('debian')).toBe('debian');
});

test('categorizes connection errors into stable kinds', async () => {
  expect(categorizeConnectionError(new Error('Failed to fetch'))).toBe('network');
  expect(categorizeConnectionError(new Error('Request timeout after 10s'))).toBe('timeout');
  expect(categorizeConnectionError(new Error('API Auth Error: 401 Unauthorized'))).toBe('auth');
  expect(categorizeConnectionError(new Error('Please use an HTTPS URL.'))).toBe('https-only');
  expect(categorizeConnectionError(new Error('NetworkError when attempting to fetch'))).toBe('network');
  expect(categorizeConnectionError(new Error('Permission denied'))).toBe('permission');
  expect(categorizeConnectionError(new Error('ERR_CERT_AUTHORITY_INVALID'))).toBe('selfsigned');
  expect(categorizeConnectionError(new Error('self-signed certificate'))).toBe('selfsigned');
  expect(categorizeConnectionError(new Error('TLS handshake failed'))).toBe('tls');
  expect(categorizeConnectionError(new Error(''))).toBe('unknown');
});

test('exposes snapshot CRUD endpoints with correct URLs and methods', async () => {
  const calls = [];
  const api = new ProxmoxAPI('https://example.test', 'user@pve!t=secret');
  api.fetch = async (endpoint, options = {}) => {
    calls.push({ endpoint, options });
    return [];
  };

  await api.getSnapshots('pve1', 'qemu', 100);
  await api.createSnapshot('pve1', 'qemu', 100, 'pre-upgrade', 'before kernel update');
  await api.deleteSnapshot('pve1', 'qemu', 100, 'old-snap');
  await api.rollbackSnapshot('pve1', 'qemu', 100, 'pre-upgrade');

  expect(calls[0].endpoint).toBe('/nodes/pve1/qemu/100/snapshot');
  expect(calls[0].options.method).toBeUndefined();

  expect(calls[1].endpoint).toBe('/nodes/pve1/qemu/100/snapshot');
  expect(calls[1].options.method).toBe('POST');
  expect(String(calls[1].options.body)).toContain('snapname=pre-upgrade');
  expect(String(calls[1].options.body)).toContain('description=before+kernel+update');

  expect(calls[2].endpoint).toBe('/nodes/pve1/qemu/100/snapshot/old-snap');
  expect(calls[2].options.method).toBe('DELETE');

  expect(calls[3].endpoint).toBe('/nodes/pve1/qemu/100/snapshot/pre-upgrade/rollback');
  expect(calls[3].options.method).toBe('POST');
});

test('cluster tasks endpoint forwards limit, source and errors flag', async () => {
  const calls = [];
  const api = new ProxmoxAPI('https://example.test', 'user@pve!t=secret');
  api.fetch = async (endpoint) => {
    calls.push(endpoint);
    return [];
  };

  await api.getClusterTasks();
  await api.getClusterTasks({ limit: 5, source: 'active', errors: true });

  expect(calls[0]).toBe('/cluster/tasks?limit=25&source=archive');
  expect(calls[1]).toBe('/cluster/tasks?limit=5&source=active&errors=1');
});

test('vmAction supports pause and resume actions', async () => {
  const calls = [];
  const api = new ProxmoxAPI('https://example.test', 'user@pve!t=secret');
  api.fetch = async (endpoint, options = {}) => {
    calls.push({ endpoint, method: options.method });
    return null;
  };

  await api.vmAction('pve1', 'qemu', 100, 'pause');
  await api.vmAction('pve1', 'qemu', 100, 'resume');

  expect(calls[0]).toEqual({ endpoint: '/nodes/pve1/qemu/100/status/pause', method: 'POST' });
  expect(calls[1]).toEqual({ endpoint: '/nodes/pve1/qemu/100/status/resume', method: 'POST' });
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify({ data: payload }), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' }
  });
}

test('fetch fails over to the next node and updates console URL origin', async () => {
  const api = new ProxmoxAPI(
    'https://pve1.example.test:8006',
    'user@pve!t=secret',
    ['https://pve2.example.test:8006']
  );
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (String(url).includes('pve1.example.test')) {
      throw new TypeError('Failed to fetch');
    }
    return jsonResponse([{ type: 'node', node: 'pve2' }]);
  };

  try {
    const resources = await api.getResources();
    expect(resources).toEqual([{ type: 'node', node: 'pve2' }]);
    expect(api.currentUrl).toBe('https://pve2.example.test:8006');
    expect(api.getConsoleUrl('pve2', 'node')).toBe('https://pve2.example.test:8006/?console=shell&xtermjs=1&node=pve2');
    expect(calls[0]).toContain('https://pve1.example.test:8006/api2/json/cluster/resources');
    expect(calls[1]).toContain('https://pve2.example.test:8006/api2/json/cluster/resources');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetch short-circuits on 401 without trying failover URLs', async () => {
  const api = new ProxmoxAPI(
    'https://pve1.example.test:8006',
    'user@pve!t=secret',
    ['https://pve2.example.test:8006']
  );
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response('denied', { status: 401, statusText: 'Unauthorized' });
  };

  try {
    await expect(api.getResources()).rejects.toThrow(/API Auth Error: 401/);
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('nodeAction posts command payload to node status', async () => {
  const api = new ProxmoxAPI('https://example.test', 'user@pve!t=secret');
  const calls = [];
  api.fetch = async (endpoint, options = {}) => {
    calls.push({ endpoint, method: options.method, body: String(options.body || '') });
    return null;
  };

  await api.nodeAction('pve1', 'reboot');
  expect(calls[0].endpoint).toBe('/nodes/pve1/status');
  expect(calls[0].method).toBe('POST');
  expect(calls[0].body).toContain('command=reboot');
});

test('getResourceDetails does not mutate the RRD array', async () => {
  const api = new ProxmoxAPI('https://example.test', 'user@pve!t=secret');
  const rrd = [
    { netin: null, netout: null },
    { netin: 10, netout: 4, diskread: 1, diskwrite: 2 }
  ];
  api.getNodeStatus = async () => ({ pveversion: 'pve-manager/8.3.0/abc', cpu: 0.1 });
  api.getNodeRRD = async () => rrd;
  api.getNodeNetwork = async () => [];

  const res = { type: 'node', node: 'pve1' };
  await api.getResourceDetails(res);
  expect(rrd[0].netin).toBeNull();
  expect(res.netin).toBe(10);
});

test('checkSession returns true when a PVE cookie exists on the current URL', async () => {
  const api = new ProxmoxAPI('https://pve1.example.test:8006', 'user@pve!t=secret');
  api.currentUrl = 'https://pve2.example.test:8006';
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    cookies: {
      get: async ({ url }) => (url.includes('pve2.example.test') ? { name: 'PVEAuthCookie' } : null),
      getAll: async () => []
    }
  };
  try {
    await expect(api.checkSession()).resolves.toBe(true);
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('builds failover URLs from FQDNs or sibling hostnames only', async () => {
  expect(deriveFailoverHostname('pve2', 'pve1.lan')).toBe('pve2.lan');
  expect(deriveFailoverHostname('pve2', 'pve1')).toBeNull();
  expect(buildFailoverUrlList('https://pve1.lan:8006', [
    { type: 'node', node: 'pve1' },
    { type: 'node', node: 'pve2' }
  ])).toEqual([
    'https://pve1.lan:8006',
    'https://pve2.lan:8006'
  ]);
  expect(buildFailoverUrlList('https://pve1.lan:8006', [
    { type: 'node', node: 'pve1' }
  ])).toBeNull();
});
