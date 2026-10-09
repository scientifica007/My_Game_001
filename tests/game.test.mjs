import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

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

test('speed toggle and best-score storage are present', () => {
  assert.match(html, /id="speedBtn"/);
  assert.match(scriptTags[0][1], /oasis-defenders-best-score/);
  assert.match(scriptTags[0][1], /function\s+frame\s*\(/);
});

test('no external script, stylesheet, or runtime network calls', () => {
  assert.doesNotMatch(html, /<link\b[^>]*rel="stylesheet"[^>]*href=/i);
  assert.doesNotMatch(html, /<script\b[^>]*src=/i);
  assert.doesNotMatch(scriptTags[0][1], /\bfetch\s*\(|\bXMLHttpRequest\b/);
});

test('wind tower is affordable, builds on valid terrain and slows a moving enemy', () => {
  class FakeElement {
    constructor(id) {
      this.id = id;
      this.textContent = '';
      this.style = {};
      this.handlers = {};
      this.classList = { add() {}, remove() {}, toggle() {} };
      this.attributes = {};
      this.disabled = false;
    }
    addEventListener(event, cb) { this.handlers[event] = cb; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 768, height: 512 }; }
    getContext() { return new Proxy({}, { get: () => () => {} }); }
    click() { this.handlers.click?.({}); }
  }
  const els = new Map();
  const document = {
    getElementById(id) {
      if (!els.has(id)) els.set(id, new FakeElement(id));
      return els.get(id);
    },
    addEventListener() {},
    hidden: false,
  };
  let nextFrame = null;
  const window = {};
  const sandbox = {
    document,
    window,
    requestAnimationFrame(cb) { nextFrame = cb; },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    HTMLButtonElement: FakeElement,
    Math,
  };
  runInNewContext(scriptTags[0][1], sandbox, { timeout: 1000 });
  els.get('modalBtn').click();
  els.get('windBtn').click();
  els.get('game').handlers.click({ clientX: 5.5 * 64, clientY: 4.5 * 64 });
  let snapshot = window.__oasisTest();
  assert.equal(snapshot.numberOfTowers, 1);
  assert.equal(snapshot.towerTypes[0], 'wind');
  assert.equal(snapshot.gold, 90);
  assert.equal(els.get('windBtn').attributes['aria-pressed'], 'true');
  els.get('waveBtn').click();
  let slowedObserved = false;
  for (let tick = 1; tick <= 550; tick++) {
    nextFrame(tick * 45);
    snapshot = window.__oasisTest();
    if (snapshot.slowedEnemies > 0) { slowedObserved = true; break; }
  }
  assert.equal(slowedObserved, true, 'Wind tower must actually slow an enemy in combat');
});

test('wind tower supports upgrades, selling and keyboard selection', () => {
  assert.match(html, /id="windBtn"/);
  const script = scriptTags[0][1];
  assert.match(script, /else if\(e\.key==='3'\)choose\('wind'\)/);
  assert.match(script, /function\s+upgradeCost/);
  assert.match(script, /slowStrength/);
  assert.match(script, /slowDuration/);
});
