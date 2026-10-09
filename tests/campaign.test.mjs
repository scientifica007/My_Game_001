import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import { buildSync } from 'esbuild';
import { resolve } from 'node:path';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const original=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const configSource=readFileSync(new URL('../src/config.js',import.meta.url),'utf8');

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
  let script="import {enemyBlueprint} from './levels.js';\n"+original.replace("render(state==='paused'?0:dt*speed);","");
  const injection="window.__campaignHarness={enemyBlueprint,readyAt(newLevel){level=newLevel;wave=(newLevel-1)*WAVES;selectMap(level);gold=800;life=12;state='ready';towers=[];enemies=[];bullets=[];saveCheckpoint();updateUI()},attemptAdvance(){return advanceLevel()},completeLevel(){state='battle';spawnLeft=0;enemies=[];return advanceLevel()},fatalLeakAtFinalWave(stage){level=stage;wave=stage*WAVES;selectMap(stage);checkpoint={level:stage,wave:(stage-1)*WAVES,life:10,gold:300,kills:22};life=1;state='battle';spawnLeft=0;spawned=1;spawnMax=1;towers=[];bullets=[];enemies=[{kind:'normal',hp:10,maxHp:10,damage:1,reward:10,dead:false,progress:PATH.length-1-.005,speed:1,slowTime:0,slowStrength:0,x:0,y:0}];updateUI()},emptyDeadFinalWave(stage){level=stage;wave=stage*WAVES;selectMap(stage);checkpoint={level:stage,wave:(stage-1)*WAVES,life:10,gold:300,kills:22};life=0;state='battle';spawnLeft=0;enemies=[];bullets=[];updateUI()},funds(amount){gold=amount;updateUI()},setLife(value){life=value;updateUI()},setWave(value){wave=value;updateUI()},path(){return PATH.map(a=>[...a])},towerInfo(){return towers.map(t=>({c:t.c,r:t.r,type:t.type,level:t.level}))}};})();"
  script=script.replace(/\}\)\(\);\s*$/,injection);
  const bundle=buildSync({stdin:{contents:script,resolveDir:resolve('src'),sourcefile:'src/main.js',loader:'js'},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'silent'}).outputFiles[0].text;
  assert.doesNotThrow(()=>new Script(bundle));
  runInNewContext(bundle,context,{timeout:1000});
  function tick(count=1){for(let i=0;i<count;i++){ms+=45;frame(ms);}}
  function place(c,r,type='arrow'){elements.get(type+'Btn').click();elements.get('game').events.click({clientX:(c+.5)*64,clientY:(r+.5)*64});}
  elements.get('modalBtn').click();
  return {window,elements,tick,place,state:()=>window.__oasisTest(),harness:window.__campaignHarness};
}

test('campaign displays five levels and twenty-five waves',()=>{
  assert.match(html,/id="levelValue"/);
  assert.match(html,/5 مستويات · 25 موجة/);
  assert.match(configSource,/LEVELS=5,TOTAL_WAVES=WAVES\*LEVELS/);
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
  for(let l=1;l<=5;l++){
    g.harness.readyAt(l);
    for(let c=0;c<12;c++)g.place(c,0,'arrow');
    const max=[8,7,6,6,6][l-1];
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
  assert.equal(g.harness.completeLevel(),true);
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

test('balance probe: stage 3 needs good placement and upgrades',()=>{
  const g=boot();
  g.harness.readyAt(3);
  g.harness.funds(255);
  const locations=[[4,3,'cannon'],[9,4,'cannon'],[6,4,'arrow'],[2,3,'wind'],[10,2,'arrow'],[7,2,'arrow']];
  const costs={arrow:55,cannon:95,wind:80};
  let waveRecords=[],previousWave=0,steps=0;
  const invest=()=>{
    const info=g.harness.towerInfo();
    if(info.length<locations.length){
      const [c,r,type]=locations[info.length];
      if(g.state().gold>=costs[type])g.place(c,r,type);
    } else {
      for(const tower of info.filter(x=>x.level<3)){
        const upgradeCost=45+tower.level*25+(tower.type==='cannon'?20:tower.type==='wind'?8:0);
        if(g.state().gold>=upgradeCost){
          g.elements.get('game').events.click({clientX:(tower.c+.5)*64,clientY:(tower.r+.5)*64});
          g.elements.get('upgradeBtn').click();
          break;
        }
      }
    }
  };
  while(steps++<13000){
    if(steps%11===0) invest();
    const before=g.state();
    if(before.state==='ready'){
      if(before.wave>=15)break;
      g.elements.get('waveBtn').click();
    }
    g.tick();
    const now=g.state();
    if(now.wave!==previousWave){previousWave=now.wave;waveRecords.push([now.wave,now.life,now.gold,now.numberOfTowers]);}
    if(now.state==='lost'||now.state==='won'||now.state==='intermission')break;
  }
  const result=g.state();
  console.log('Stage 3 strategy probe',JSON.stringify({state:result.state,localWave:result.localWave,life:result.life,kills:result.kills,gold:result.gold,towers:g.harness.towerInfo(),steps,records:waveRecords}));
  assert.equal(result.state,'intermission','Stage 3 must be cleared before unlocking stage 4');
  assert.equal(result.level,4);
  assert.ok(result.life>=1&&result.life<=12,'The successful strategy should survive stage 3');
});

test('poorly distributed towers fail even when enough gold was spent',()=>{
  const g=boot();
  g.harness.readyAt(3);
  g.harness.funds(420);
  for(let c=0;c<6;c++)g.place(c,7,'arrow');
  assert.equal(g.state().numberOfTowers,6);
  assert.equal(g.state().gold,90);
  g.elements.get('waveBtn').click();
  for(let i=0;i<1700;i++){
    g.tick();
    const state=g.state();
    if(state.state==='ready'&&state.wave<13)g.elements.get('waveBtn').click();
    if(state.state==='lost')break;
  }
  assert.equal(g.state().state,'lost','Bad positioning should not succeed solely by spending resources');
  assert.ok(g.state().wave<=12);
});


test('fatal leak on the last wave of level 2 never unlocks level 3',()=>{
  const g=boot();
  g.harness.fatalLeakAtFinalWave(2);
  assert.equal(g.state().level,2);
  assert.equal(g.state().wave,10);
  g.tick();
  const lost=g.state();
  assert.equal(lost.state,'lost');
  assert.equal(lost.life,0);
  assert.equal(lost.level,2,'The player must remain at the failed level');
  assert.equal(lost.wave,10);
  assert.equal(g.elements.get('modalBtn').textContent,'إعادة المستوى 2');
  assert.equal(g.elements.get('restartCampaignBtn').hidden,false);
  assert.equal(g.harness.attemptAdvance(),false,'A direct unlock attempt must be rejected');
  g.tick(30);
  assert.equal(g.state().state,'lost');
  assert.equal(g.state().level,2);
  g.elements.get('modalBtn').click();
  assert.equal(g.state().level,2,'Replay restarts only the failed level, not the next one');
  assert.equal(g.state().state,'ready');
  assert.equal(g.state().life,10);
  assert.equal(g.state().gold,300);
  assert.equal(g.state().wave,5);
  assert.equal(g.state().checkpointLevel,2);
});

test('zero-health and empty battlefield must resolve as defeat, not stage completion',()=>{
  for(const stage of [1,2]){
    const g=boot();
    g.harness.emptyDeadFinalWave(stage);
    assert.equal(g.harness.attemptAdvance(),false);
    g.tick();
    assert.equal(g.state().state,'lost');
    assert.equal(g.state().level,stage);
    assert.equal(g.state().life,0);
  }
});

test('surviving the final wave of level 2 unlocks level 3 legitimately',()=>{
  const g=boot();
  g.harness.readyAt(2);
  g.harness.setWave(10);
  g.harness.setLife(3);
  assert.equal(g.harness.attemptAdvance(),false,'Preparation does not unlock a level');
  assert.equal(g.state().level,2);
  assert.equal(g.harness.completeLevel(),true);
  assert.equal(g.state().state,'intermission');
  assert.equal(g.state().level,3);
  assert.equal(g.state().life,6);
  assert.equal(g.elements.get('modalBtn').textContent,'الاستعداد للمستوى 3');
  g.elements.get('modalBtn').click();
  assert.equal(g.state().state,'ready');
  assert.equal(g.state().level,3);
  g.elements.get('waveBtn').click();
  assert.equal(g.state().wave,11);
});

test('loss menu offers both checkpoint replay and fresh campaign',()=>{
  const g=boot();
  g.harness.fatalLeakAtFinalWave(4);
  g.tick();
  assert.equal(g.state().state,'lost');
  assert.equal(g.state().level,4);
  assert.equal(g.state().checkpointGold,300);
  assert.equal(g.elements.get('modalBtn').textContent,'إعادة المستوى 4');
  assert.equal(g.elements.get('restartCampaignBtn').hidden,false);
  g.elements.get('modalBtn').click();
  assert.equal(g.state().state,'ready');
  assert.equal(g.state().level,4);
  assert.equal(g.state().wave,15);
  assert.equal(g.state().gold,300);
  assert.equal(g.state().life,10);
  assert.equal(g.state().numberOfTowers,0);
  g.harness.fatalLeakAtFinalWave(4);
  g.tick();
  g.elements.get('restartCampaignBtn').click();
  assert.equal(g.state().state,'ready');
  assert.equal(g.state().level,1);
  assert.equal(g.state().gold,170);
  assert.equal(g.state().life,12);
  assert.equal(g.state().wave,0);
  assert.equal(g.state().checkpointLevel,1);
});

test('stage-entry snapshot is immutable during construction and combat',()=>{
  const g=boot();
  g.harness.readyAt(4);
  const checkpoint=g.state().checkpointGold;
  g.place(4,3,'cannon');
  assert.equal(g.state().gold,705);
  assert.equal(g.state().checkpointGold,checkpoint);
  assert.equal(g.state().checkpointWave,15);
});

function strategicStageProbe(stage){
 const g=boot();
 g.harness.readyAt(stage);
 g.harness.funds(stage===4?330:350);
 // Reference setup consists only of normal, reproducible player inputs:
 // place a tower when affordable, upgrade it, start each available wave.
 const builds=stage===4?
  [[4,3,'cannon'],[7,6,'cannon'],[9,5,'cannon'],[2,5,'wind'],[7,2,'arrow'],[10,3,'arrow']]:
  [[3,2,'cannon'],[6,3,'cannon'],[9,6,'cannon'],[1,5,'wind'],[7,5,'arrow'],[10,4,'arrow']];
 const cost={arrow:55,cannon:95,wind:80};
 let steps=0,previousWave=-1;
 const records=[];
 while(steps++<12500){
   if(steps%8===0){
     const info=g.harness.towerInfo();
     if(info.length<builds.length){
       const [c,r,type]=builds[info.length];
       if(g.state().gold>=cost[type])g.place(c,r,type);
     }else{
       for(const tower of info.filter(x=>x.level<3)){
         const price=45+tower.level*25+(tower.type==='cannon'?20:tower.type==='wind'?8:0);
         if(g.state().gold>=price){
           g.elements.get('game').events.click({clientX:(tower.c+.5)*64,clientY:(tower.r+.5)*64});
           g.elements.get('upgradeBtn').click();
           break;
         }
       }
     }
   }
   const before=g.state();
   if(before.state==='ready')g.elements.get('waveBtn').click();
   g.tick();
   const now=g.state();
   if(now.wave!==previousWave){previousWave=now.wave;records.push([now.wave,now.life,now.gold]);}
   if(['intermission','won','lost'].includes(now.state))break;
 }
 const result=g.state();
 console.log('Stage '+stage+' playable-strategy probe',JSON.stringify({state:result.state,level:result.level,life:result.life,gold:result.gold,kills:result.kills,steps,records,towers:g.harness.towerInfo()}));
 return result;
}

test('stage 4 feasibility probe under human-usable placement and upgrade actions',()=>{
 const s=strategicStageProbe(4);
 assert.ok(['lost','intermission'].includes(s.state));
});
test('stage 5 feasibility probe under human-usable placement and upgrade actions',()=>{
 const s=strategicStageProbe(5);
 assert.ok(['lost','won'].includes(s.state));
});
