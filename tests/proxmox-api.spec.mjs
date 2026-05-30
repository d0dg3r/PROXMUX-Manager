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

const { formatGuestOsType, categorizeConnectionError, ProxmoxAPI } = mod;

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
