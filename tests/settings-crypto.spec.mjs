import { test, expect } from '@playwright/test';
import { importLibModule } from './import-lib.mjs';

const { encryptSettingsPayload, decryptSettingsPayload } = await importLibModule('settings-crypto.js');

test('encrypts and decrypts a settings payload', async () => {
  const payload = { settings: { theme: 'dark', proxmoxUrl: 'https://pve.example.test:8006' } };
  const blob = await encryptSettingsPayload(payload, 'correct-horse');
  expect(blob.version).toBe(1);
  expect(blob.cipher).toBe('AES-GCM');
  expect(blob.ciphertext).toBeTruthy();

  const decrypted = await decryptSettingsPayload(blob, 'correct-horse');
  expect(decrypted).toEqual(payload);
});

test('rejects a wrong password', async () => {
  const blob = await encryptSettingsPayload({ settings: { theme: 'light' } }, 'right-password');
  await expect(decryptSettingsPayload(blob, 'wrong-password')).rejects.toThrow(/Could not decrypt backup/);
});

test('rejects a corrupt ciphertext', async () => {
  const blob = await encryptSettingsPayload({ settings: { theme: 'light' } }, 'right-password');
  blob.ciphertext = `${blob.ciphertext}aaaa`;
  await expect(decryptSettingsPayload(blob, 'right-password')).rejects.toThrow(/Could not decrypt backup/);
});

test('requires a password for export and import', async () => {
  await expect(encryptSettingsPayload({ settings: {} }, '   ')).rejects.toThrow(/Password is required/);
  await expect(decryptSettingsPayload({ version: 1 }, '')).rejects.toThrow(/Password is required/);
});
