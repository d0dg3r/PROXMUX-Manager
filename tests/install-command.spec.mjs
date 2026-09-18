import { test, expect } from '@playwright/test';
import { importLibModule } from './import-lib.mjs';

const { buildInstallCommandForScript, buildInstallCommandForScripts } = await importLibModule('install-command.js');

const trustedUrl = 'https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/docker.sh';

test('builds a trusted double-quoted install command', async () => {
  expect(buildInstallCommandForScript({
    name: 'Docker',
    slug: 'docker',
    installUrl: trustedUrl
  })).toBe(`bash -c "$(curl -fsSL ${trustedUrl})"`);
});

test('rejects untrusted install URLs', async () => {
  expect(() => buildInstallCommandForScript({
    name: 'Evil',
    slug: 'evil',
    installUrl: 'https://evil.example/install.sh'
  })).toThrow(/No trusted install URL/);
});

test('joins multiple scripts and escapes shell metacharacters', async () => {
  const command = buildInstallCommandForScripts([
    { name: 'Docker', slug: 'docker', installUrl: trustedUrl },
    {
      name: 'Quote',
      slug: 'quote',
      installUrl: 'https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/foo-bar.sh'
    }
  ]);
  expect(command).toContain(`bash -c "$(curl -fsSL ${trustedUrl})"`);
  expect(command).toContain('ct/foo-bar.sh');
  expect(command.split('\n\n')).toHaveLength(2);
});

test('requires at least one selected script', async () => {
  expect(() => buildInstallCommandForScripts([])).toThrow(/No scripts selected/);
});
