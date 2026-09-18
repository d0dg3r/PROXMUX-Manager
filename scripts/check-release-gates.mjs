#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function fail(message) {
  console.error(`Release gate failed: ${message}`);
  process.exitCode = 1;
}

const manifest = readJson('manifest.json');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const optionsHtml = fs.readFileSync(path.join(root, 'options/options.html'), 'utf8');
const optionsMatch = optionsHtml.match(/Version\s+([0-9]+(?:\.[0-9]+){1,3})/);

const versions = {
  'manifest.json': manifest.version,
  'package.json': packageJson.version,
  'package-lock.json': packageLock.version,
  'options/options.html': optionsMatch?.[1] || null
};

const uniqueVersions = [...new Set(Object.values(versions))];
if (uniqueVersions.length !== 1 || !uniqueVersions[0]) {
  fail(`version mismatch: ${JSON.stringify(versions)}`);
} else {
  console.log(`Versions aligned at ${uniqueVersions[0]}`);
}

const en = readJson('_locales/en/messages.json');
const de = readJson('_locales/de/messages.json');
const enKeys = Object.keys(en).sort();
const deKeys = Object.keys(de).sort();
const missingInDe = enKeys.filter((key) => !de[key]);
const missingInEn = deKeys.filter((key) => !en[key]);

if (missingInDe.length || missingInEn.length) {
  if (missingInDe.length) fail(`locale keys missing in de: ${missingInDe.join(', ')}`);
  if (missingInEn.length) fail(`locale keys missing in en: ${missingInEn.join(', ')}`);
} else {
  console.log(`Locale key parity OK (${enKeys.length} keys)`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
