import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../assets/game.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../assets/styles.css', import.meta.url), 'utf8');

test('HTML entry point preserves Arabic layout and links local assets', () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html\s+lang="ar"\s+dir="rtl">/i);
  assert.match(html, /<canvas\s+id="game"\s+width="768"\s+height="512"/i);
  assert.match(html, /<\/html>/i);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/assets\/styles\.css"/i);
  assert.match(html, /<script\s+src="\.\/assets\/game\.js"\s+defer><\/script>/i);
});

test('external JavaScript parses, and responsive CSS is separated', () => {
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotThrow(() => new Script(script, { filename: 'assets/game.js' }));
  assert.match(styles, /\.layout\s*\{/);
  assert.match(styles, /@media/);
});

test('five-wave game with victory, defeat and replay', () => {
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
    assert.match(script, new RegExp(`function\\s+${action}\\s*\\(`));
  }
});

test('speed toggle and best-score storage are present', () => {
  assert.match(html, /id="speedBtn"/);
  assert.match(script, /oasis-defenders-best-score/);
  assert.match(script, /function\s+frame\s*\(/);
});

test('all runtime assets are local and require no network', () => {
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(script, /\bfetch\s*\(|\bXMLHttpRequest\b/);
  assert.doesNotMatch(styles, /@import\b|url\s*\(\s*['"]?https?:/i);
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
  runInNewContext(script, sandbox, { timeout: 1000 });
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
  assert.match(script, /else if\(e\.key==='3'\)choose\('wind'\)/);
  assert.match(script, /function\s+upgradeCost/);
  assert.match(script, /slowStrength/);
  assert.match(script, /slowDuration/);
});
