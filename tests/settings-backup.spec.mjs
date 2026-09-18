import { test, expect } from '@playwright/test';
import { importLibModule } from './import-lib.mjs';

const {
  BACKUP_STORAGE_KEYS,
  filterFavoriteIdsByExistingResources,
  importEncryptedSettingsFromText,
  createEncryptedSettingsBackup
} = await importLibModule('settings-backup.js');

function createStorageMock(initial = {}) {
  const store = { ...initial };
  return {
    store,
    chrome: {
      storage: {
        local: {
          get: async (keys) => {
            if (Array.isArray(keys)) {
              return keys.reduce((acc, key) => {
                acc[key] = store[key];
                return acc;
              }, {});
            }
            return { ...store };
          },
          set: async (values) => {
            Object.assign(store, values);
          },
          remove: async (keys) => {
            const list = Array.isArray(keys) ? keys : [keys];
            list.forEach((key) => delete store[key]);
          }
        }
      }
    }
  };
}

test('filters favorite ids to existing resources', async () => {
  expect(filterFavoriteIdsByExistingResources(
    [' vm-1 ', 'missing', 'vm-1', 12],
    ['vm-1', 'lxc-2']
  )).toEqual(['vm-1']);
});

test('backup key list includes current cluster overview settings', async () => {
  expect(BACKUP_STORAGE_KEYS).toContain('clusters');
  expect(BACKUP_STORAGE_KEYS).toContain('autoRefreshIntervalSeconds');
  expect(BACKUP_STORAGE_KEYS).toContain('showClusterDashboard');
});

test('creates and imports an encrypted settings backup', async () => {
  const originalChrome = globalThis.chrome;
  const { chrome, store } = createStorageMock({
    theme: 'dark',
    clusters: {
      homelab: {
        id: 'homelab',
        name: 'Homelab',
        proxmoxUrl: 'https://pve.example.test:8006',
        apiUser: 'api-admin@pve',
        apiTokenId: 'full-access',
        apiSecret: 'secret',
        apiToken: 'api-admin@pve!full-access=secret',
        failoverUrls: [],
        isEnabled: true
      }
    },
    activeClusterId: 'homelab',
    leftoverKey: 'should-not-export'
  });
  globalThis.chrome = chrome;

  try {
    const backup = await createEncryptedSettingsBackup('export-pass', 'export-pass');
    expect(backup.filename).toMatch(/proxmux-settings-.*\.secure\.json/);

    store.theme = 'light';
    store.clusters = {};
    store.activeClusterId = null;
    store.sshDefaultUser = 'root';

    await importEncryptedSettingsFromText(JSON.stringify(backup.encrypted), 'export-pass');
    expect(store.theme).toBe('dark');
    expect(store.clusters.homelab.name).toBe('Homelab');
    expect(store.activeClusterId).toBe('homelab');
    expect(store.sshDefaultUser).toBeUndefined();
  } finally {
    globalThis.chrome = originalChrome;
  }
});
