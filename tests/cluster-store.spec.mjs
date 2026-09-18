import { test, expect } from '@playwright/test';
import { importLibModule } from './import-lib.mjs';

const {
  buildClusterPayload,
  createClusterSkeleton,
  getClusterList,
  removeClusterAndResolve,
  resolveActiveClusterId
} = await importLibModule('cluster-store.js');

test('creates a unique cluster skeleton id', async () => {
  const first = createClusterSkeleton({}, 'Cluster');
  const second = createClusterSkeleton({ [first.id]: first }, 'Cluster');
  expect(first.id).toBe('cluster');
  expect(second.id).toBe('cluster-2');
  expect(first.apiUser).toBe('api-admin@pve');
});

test('keeps an existing cluster id when renaming', async () => {
  const existing = {
    prod: {
      id: 'prod',
      name: 'Production',
      proxmoxUrl: 'https://pve.example.test:8006',
      apiUser: 'api-admin@pve',
      apiTokenId: 'full-access',
      apiSecret: 'secret',
      apiToken: 'api-admin@pve!full-access=secret'
    }
  };
  const updated = buildClusterPayload({ ...existing.prod, name: 'Prod West' }, existing);
  expect(updated.id).toBe('prod');
  expect(updated.name).toBe('Prod West');
});

test('generates a new id when creating a cluster without an existing id', async () => {
  const existing = {
    lab: { id: 'lab', name: 'Lab', proxmoxUrl: '', apiUser: '', apiTokenId: '', apiSecret: '' }
  };
  const created = buildClusterPayload({ name: 'Lab Copy' }, existing);
  expect(created.id).toBe('lab-copy');
  expect(created.name).toBe('Lab Copy');
});

test('resolves active cluster and filters enabled clusters', async () => {
  const clusters = {
    a: { id: 'a', name: 'A', isEnabled: true },
    b: { id: 'b', name: 'B', isEnabled: false }
  };
  expect(resolveActiveClusterId(clusters, 'missing')).toBe('a');
  expect(getClusterList(clusters).map((cluster) => cluster.id)).toEqual(['a']);
});

test('removes a cluster and keeps one fallback when required', async () => {
  const clusters = {
    only: { id: 'only', name: 'Only', proxmoxUrl: 'https://pve.example.test:8006' }
  };
  const removed = removeClusterAndResolve(clusters, 'only', 'only', { ensureOneCluster: true });
  expect(Object.keys(removed.clusters)).toHaveLength(1);
  expect(removed.activeClusterId).toBeTruthy();
  expect(removed.clusters[removed.activeClusterId].name).toBe('Cluster');
});
