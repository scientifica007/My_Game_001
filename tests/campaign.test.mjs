import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const original=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][0][1];

function boot() {
  class FakeElement {
    constructor(id){this.id=id;this.textContent='';this.style={};this.classList={add(){},remove(){},toggle(){}};this.events={};this.attributes={};this.disabled=false;}
    addEventListener(type,callback){this.events[type]=callback;}
    setAttribute(key,value){this.attributes[key]=value;}
    getBoundingClientRect(){return{left:0,top:0,width:768,height:512};}
    getContext(){return new Proxy({},{get:(obj,key)=>obj[key]??(()=>{})});}
    click(){this.events.click?.({});}
  }
  const elements=new Map(),window={};
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id);},
    addEventListener(){},hidden:false
  };
  let frame=null,ms=0;
  const context={document,window,Math,HTMLButtonElement:FakeElement,
    requestAnimationFrame(callback){frame=callback;},
    localStorage:{getItem(){return null;},setItem(){}},
    setTimeout(){return 1;},clearTimeout(){}};
  // Only accelerate the test renderer; keep actual gameplay simulation intact.
  let script=original.replace("render(state==='paused'?0:dt*speed);","");
  const injection="window.__campaignHarness={enemyBlueprint,readyAt(newLevel){level=newLevel;wave=(newLevel-1)*WAVES;selectMap(level);gold=800;life=12;state='ready';towers=[];enemies=[];bullets=[];updateUI()},advanceLevel(){advanceLevel()},funds(amount){gold=amount;updateUI()},setLife(value){life=value;updateUI()},setWave(value){wave=value;updateUI()},path(){return PATH.map(a=>[...a])}};})();";
  script=script.replace(/\}\)\(\);\s*$/,injection);
  assert.doesNotThrow(()=>new Script(script));
  runInNewContext(script,context,{timeout:1000});
  function tick(count=1){for(let i=0;i<count;i++){ms+=45;frame(ms);}}
  function place(c,r,type='arrow'){elements.get(type+'Btn').click();elements.get('game').events.click({clientX:(c+.5)*64,clientY:(r+.5)*64});}
  elements.get('modalBtn').click();
  return {window,elements,tick,place,state:()=>window.__oasisTest(),harness:window.__campaignHarness};
}

test('campaign displays three levels and fifteen waves',()=>{
  assert.match(html,/id="levelValue"/);
  assert.match(html,/3 مستويات · 15 موجة/);
  assert.match(original,/LEVELS=3,TOTAL_WAVES=WAVES\*LEVELS/);
  const g=boot();
  assert.equal(g.state().level,1);
  assert.equal(g.state().localWave,0);
  assert.equal(g.state().towerLimit,8);
});

test('enemy health and speed rise by wave and level; bosses are distinct',()=>{
  const g=boot(),b=g.harness.enemyBlueprint;
  assert.ok(b(1,5,0,20).hp>b(1,1,0,8).hp);
  assert.ok(b(2,1,0,11).hp>b(1,1,0,8).hp);
  assert.ok(b(3,1,0,14).hp>b(2,1,0,11).hp);
  assert.ok(b(3,5,0,26).speed>b(1,1,0,8).speed);
  assert.equal(b(3,5,25,26).kind,'boss');
  assert.ok(b(3,5,25,26).hp>1000);
  assert.equal(b(3,5,25,26).damage,4);
});

test('no-defense strategy loses early rather than winning passively',()=>{
  const g=boot();
  g.elements.get('waveBtn').click();
  for(let i=0;i<1700;i++){
    g.tick();
    const s=g.state();
    if(s.state==='ready'&&s.wave<3)g.elements.get('waveBtn').click();
    if(s.state==='lost')break;
  }
  assert.equal(g.state().state,'lost');
  assert.equal(g.state().life,0);
  assert.ok(g.state().wave<=2);
});

test('tower cap makes resource allocation necessary, tougher stages permit fewer towers',()=>{
  const g=boot();
  for(let l=1;l<=3;l++){
    g.harness.readyAt(l);
    for(let c=0;c<12;c++)g.place(c,0,'arrow');
    const max=[8,7,6][l-1];
    assert.equal(g.state().numberOfTowers,max);
    assert.equal(g.state().towerLimit,max);
    assert.equal(g.state().gold,800-max*55);
  }
});

test('level transition changes map, resets placement and caps carried currency',()=>{
  const g=boot();
  const firstMap=JSON.stringify(g.harness.path());
  g.place(0,0);
  g.harness.setLife(6);
  g.harness.funds(9000);
  g.harness.setWave(5);
  g.harness.advanceLevel();
  assert.equal(g.state().state,'intermission');
  assert.equal(g.state().level,2);
  assert.equal(g.state().localWave,0);
  assert.equal(g.state().numberOfTowers,0);
  assert.ok(g.state().gold<=265);
  assert.equal(g.state().life,9);
  assert.notEqual(JSON.stringify(g.harness.path()),firstMap);
  g.elements.get('modalBtn').click();
  assert.equal(g.state().state,'ready');
  g.elements.get('waveBtn').click();
  assert.equal(g.state().wave,6);
  assert.equal(g.state().localWave,1);
  assert.equal(g.state().spawnLeft,11);
});

test('late-level starting income cannot buy unlimited high-damage towers',()=>{
  const g=boot();
  g.harness.readyAt(3);
  g.harness.funds(255);
  g.place(2,6,'cannon');
  g.place(4,6,'cannon');
  g.place(8,6,'cannon');
  assert.equal(g.state().numberOfTowers,2);
  assert.equal(g.state().gold,65);
  assert.ok(g.state().gold<95);
});
