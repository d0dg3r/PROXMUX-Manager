import { test, expect } from '@playwright/test';
import { importLibModule } from './import-lib.mjs';

const { resolveToolbarClickAction, attachFloatingWindowLifecycle } = await importLibModule('window-launcher.js');

test('routes toolbar clicks to side panel, floating window, or fallback', async () => {
  expect(resolveToolbarClickAction({
    clickMode: 'floating',
    canOpenSidePanel: true,
    windowId: 1
  })).toEqual({ kind: 'floating' });

  expect(resolveToolbarClickAction({
    clickMode: 'sidepanel',
    canOpenSidePanel: true,
    windowId: 7
  })).toEqual({ kind: 'sidepanel', windowId: 7 });

  expect(resolveToolbarClickAction({
    clickMode: 'sidepanel',
    canOpenSidePanel: false,
    windowId: 7
  })).toEqual({ kind: 'floating-fallback' });

  expect(resolveToolbarClickAction({
    clickMode: 'sidepanel',
    canOpenSidePanel: true,
    windowId: undefined
  })).toEqual({ kind: 'floating-fallback' });
});

test('clears the stored floating window id when that window closes', async () => {
  const originalChrome = globalThis.chrome;
  const store = { floatingWindowId: 42 };
  const listeners = [];
  globalThis.chrome = {
    runtime: { getURL: (value) => `chrome-extension://proxmux/${value}` },
    storage: {
      local: {
        get: async (keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          return list.reduce((acc, key) => {
            acc[key] = store[key];
            return acc;
          }, {});
        },
        remove: async (keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((key) => delete store[key]);
        }
      }
    },
    windows: {
      onRemoved: {
        addListener: (listener) => listeners.push(listener)
      }
    }
  };

  try {
    attachFloatingWindowLifecycle();
    expect(listeners).toHaveLength(1);
    await listeners[0](42);
    expect(store.floatingWindowId).toBeUndefined();
  } finally {
    globalThis.chrome = originalChrome;
  }
});
