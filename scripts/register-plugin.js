#!/usr/bin/env node
/**
 * Register a plugin into marketplace.json
 * Usage: node scripts/register-plugin.js <plugin-dir>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(import.meta.dirname, '..');
const marketplacePath = join(root, 'marketplace.json');

const pluginDir = process.argv[2];
if (!pluginDir) {
  console.error('Usage: node scripts/register-plugin.js <plugin-dir>');
  process.exit(1);
}

const manifestPath = join(root, pluginDir, 'plugin.json');
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error(`Failed to read ${manifestPath}:`, e.message);
  process.exit(1);
}

const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));

const entry = {
  id:          manifest.id,
  name:        manifest.name,
  version:     manifest.version,
  description: manifest.description,
  author:      manifest.author,
  category:    manifest.category,
  tags:        manifest.tags ?? [],
  path:        pluginDir,
  license:     manifest.license ?? 'MIT',
  publishedAt: manifest.publishedAt ?? new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
  downloads:   0,
};
if (manifest.homepage)   entry.homepage   = manifest.homepage;
if (manifest.repository) entry.repository = manifest.repository;

const idx = marketplace.plugins.findIndex(p => p.id === entry.id);
if (idx >= 0) {
  const prev = marketplace.plugins[idx];
  entry.downloads = prev.downloads ?? 0;
  entry.publishedAt = prev.publishedAt;
  marketplace.plugins[idx] = entry;
  console.log(`Updated plugin: ${entry.id}`);
} else {
  marketplace.plugins.push(entry);
  console.log(`Registered plugin: ${entry.id}`);
}

marketplace.updatedAt = new Date().toISOString();
marketplace.plugins.sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');
console.log('marketplace.json updated.');
