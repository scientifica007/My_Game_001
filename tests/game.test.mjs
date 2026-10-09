import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptTags = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

test('single-file game has a valid HTML document and Arabic layout', () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html\s+lang="ar"\s+dir="rtl">/i);
  assert.match(html, /<canvas\s+id="game"\s+width="768"\s+height="512"/i);
  assert.match(html, /<\/html>/i);
});

test('game has exactly one inline JavaScript entry point and parses', () => {
  assert.equal(scriptTags.length, 1);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotThrow(() => new Script(scriptTags[0][1], { filename: 'index.html' }));
});

test('five-wave game with victory, defeat and replay', () => {
  const script = scriptTags[0][1];
  assert.match(script, /\bWAVES\s*=\s*5\b/);
  assert.match(script, /function\s+win\s*\(/);
  assert.match(script, /function\s+lose\s*\(/);
  assert.match(script, /function\s+reset\s*\(/);
});

test('core tower actions, input and controls exist', () => {
  for (const id of ['game','waveBtn','pauseBtn','resetBtn','soundBtn','arrowBtn','cannonBtn','upgradeBtn','sellBtn','overlay','modalBtn']) {
    assert.ok(html.includes(`id="${id}"`), `Missing control: ${id}`);
  }
  for (const action of ['clickMap','upgrade','sell','startWave','pause']) {
    assert.match(scriptTags[0][1], new RegExp(`function\\s+${action}\\s*\\(`));
  }
});

test('no external script, stylesheet, or runtime network calls', () => {
  assert.doesNotMatch(html, /<link\b[^>]*rel="stylesheet"[^>]*href=/i);
  assert.doesNotMatch(html, /<script\b[^>]*src=/i);
  assert.doesNotMatch(scriptTags[0][1], /\bfetch\s*\(|\bXMLHttpRequest\b/);
});
