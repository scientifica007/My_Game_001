import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSync } from 'esbuild';
import { Script, runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const bundle=buildSync({entryPoints:['src/main.js'],bundle:true,format:'iife',platform:'browser',write:false,logLevel:'silent'}).outputFiles[0].text;

function startGame(){
  class FakeElement{
    constructor(id){this.id=id;this.textContent='';this.style={};this.handlers={};this.classList={add(){},remove(){},toggle(){}};this.attributes={};this.disabled=false;}
    addEventListener(e,cb){this.handlers[e]=cb}
    getBoundingClientRect(){return{left:0,top:0,width:768,height:512}}
    getContext(){return new Proxy({},{get:(_,key)=>()=>{}})}
    setAttribute(key,v){this.attributes[key]=v}
    click(){this.handlers.click?.({})}
  }
  const els=new Map(),window={};
  const document={getElementById(id){if(!els.has(id))els.set(id,new FakeElement(id));return els.get(id)},addEventListener(){},hidden:false};
  let frame=null,ms=0;
  runInNewContext(bundle,{document,window,Math,HTMLButtonElement:FakeElement,
    requestAnimationFrame(cb){frame=cb},localStorage:{getItem(){return null},setItem(){}},
    setTimeout(){return 1},clearTimeout(){}},{timeout:1000});
  const tick=()=>{ms+=45;frame(ms)};
  return {els,window,tick,state:()=>window.__oasisTest()};
}

test('Arabic UI loads modern local CSS and ES module',()=>{
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/src="\.\/src\/main\.js"/);
  assert.match(html,/type="module"/);
  assert.match(html,/href="\.\/src\/styles\.css"/);
  assert.match(html,/id="levelValue"/);
  assert.match(css,/@media/);
});

test('all imported modules bundle and compile without errors',()=>{
  assert.doesNotThrow(()=>new Script(bundle));
  assert.match(source,/import \{createSimulation\}/);
  assert.match(source,/import \{createRenderer\}/);
  assert.match(source,/import \{createUI\}/);
  assert.doesNotMatch(html,/<script\b[^>]*>[\s\S]*?function\s+simulate/);
});

test('main actions include construction, upgrade, sell and replay',()=>{
  const game=startGame();
  game.els.get('modalBtn').click();
  game.els.get('arrowBtn').click();
  game.els.get('game').handlers.click({clientX:5.5*64,clientY:4.5*64});
  assert.equal(game.state().numberOfTowers,1);
  assert.equal(game.state().gold,115);
  game.els.get('sellBtn').click();
  assert.equal(game.state().numberOfTowers,0);
  game.els.get('resetBtn').click();
  assert.equal(game.state().gold,170);
});

test('wind tower slows actual moving enemies',()=>{
  const game=startGame();
  game.els.get('modalBtn').click();
  game.els.get('windBtn').click();
  game.els.get('game').handlers.click({clientX:5.5*64,clientY:4.5*64});
  assert.equal(game.state().towerTypes[0],'wind');
  assert.equal(game.state().gold,90);
  game.els.get('waveBtn').click();
  let slowed=false;
  for(let n=0;n<600;n++){game.tick();if(game.state().slowedEnemies>0){slowed=true;break}}
  assert.equal(slowed,true);
});

test('the game uses no external runtime assets or network calls',()=>{
  assert.doesNotMatch(html,/https?:\/\//);
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest\b/);
  assert.doesNotMatch(css,/@import\b|url\s*\(\s*['"]?https?:/i);
});

test('visual quality can be toggled without changing campaign state',()=>{
  const game=startGame();
  game.els.get('modalBtn').click();
  const initial=JSON.stringify(game.state());
  assert.equal(game.els.get('qualityBtn').attributes['aria-pressed'],'true');
  game.els.get('qualityBtn').click();
  assert.equal(game.els.get('qualityBtn').attributes['aria-pressed'],'false');
  assert.match(game.els.get('qualityBtn').textContent,/اقتصادية/);
  assert.equal(JSON.stringify(game.state()),initial,'economical graphics must never change the game rules');
  game.els.get('qualityBtn').click();
  assert.equal(game.els.get('qualityBtn').attributes['aria-pressed'],'true');
  assert.equal(JSON.stringify(game.state()),initial);
});
