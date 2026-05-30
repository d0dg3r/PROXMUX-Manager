import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const modulePath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../lib/auto-refresh.js'
);
const moduleSource = fs.readFileSync(modulePath, 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource, 'utf8').toString('base64')}`;
const mod = await import(moduleUrl);

const {
  AUTO_REFRESH_OFF,
  AUTO_REFRESH_ALLOWED,
  AUTO_REFRESH_DEFAULT,
  isAutoRefreshEnabled,
  normalizeAutoRefreshSeconds
} = mod;

test('default auto-refresh interval is off', async () => {
  expect(AUTO_REFRESH_DEFAULT).toBe(AUTO_REFRESH_OFF);
  expect(AUTO_REFRESH_ALLOWED).toContain(AUTO_REFRESH_OFF);
});

test('keeps allowed values unchanged', async () => {
  for (const value of AUTO_REFRESH_ALLOWED) {
    expect(normalizeAutoRefreshSeconds(value)).toBe(value);
  }
});

test('snaps unknown positive values to nearest allowed', async () => {
  expect(normalizeAutoRefreshSeconds(20)).toBe(15);
  expect(normalizeAutoRefreshSeconds(25)).toBe(30);
  expect(normalizeAutoRefreshSeconds(45)).toBe(30);
  expect(normalizeAutoRefreshSeconds(180)).toBe(120);
  expect(normalizeAutoRefreshSeconds(240)).toBe(300);
});

test('treats invalid or sub-minimum values as off', async () => {
  expect(normalizeAutoRefreshSeconds('not-a-number')).toBe(AUTO_REFRESH_OFF);
  expect(normalizeAutoRefreshSeconds(null)).toBe(AUTO_REFRESH_OFF);
  expect(normalizeAutoRefreshSeconds(undefined)).toBe(AUTO_REFRESH_OFF);
  expect(normalizeAutoRefreshSeconds(-30)).toBe(AUTO_REFRESH_OFF);
  expect(normalizeAutoRefreshSeconds(0)).toBe(AUTO_REFRESH_OFF);
  expect(normalizeAutoRefreshSeconds(5)).toBe(AUTO_REFRESH_OFF);
});

test('isAutoRefreshEnabled gates short and zero values', async () => {
  expect(isAutoRefreshEnabled(AUTO_REFRESH_OFF)).toBe(false);
  expect(isAutoRefreshEnabled(5)).toBe(false);
  expect(isAutoRefreshEnabled(15)).toBe(true);
  expect(isAutoRefreshEnabled(60)).toBe(true);
});
