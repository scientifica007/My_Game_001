import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandscape} from '../src/landscape.js';
import {drawTowerSprite,drawEnemySprite} from '../src/sprites.js';
import {PATHS} from '../src/config.js';

function fakeCanvas() {
  const calls={arc:0,ellipse:0,drawImage:0,roundRect:0,stroke:0,fill:0,createLinearGradient:0};
  const target={
    createLinearGradient(){calls.createLinearGradient++;return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};},
  };
  const ctx=new Proxy(target,{
    get(obj,key){
      if(key in obj)return obj[key];
      if(key in calls)return calls[key];
      return ()=>{if(key in calls)calls[key]++;};
    },
    set(obj,key,value){obj[key]=value;return true;}
  });
  // Counters use explicit instrumented methods rather than canvas properties.
  for(const key of ['arc','ellipse','drawImage','roundRect','stroke','fill']) {
    target[key]=()=>{calls[key]++;};
  }
  return {ctx,calls};
}

function environment() {
  const {ctx,calls}=fakeCanvas();
  return {ctx,calls,W:768,H:512,C:64,COLS:12,ROWS:8,
    rand:(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a);},
    center:(c,r)=>({x:(c+.5)*64,y:(r+.5)*64})};
}
function level(index){
  const PATH=PATHS[index-1];
  return {PATH,level:index,pathSet:new Set(PATH.map(x=>x.join(',')))};
}

test('terrain caches background on a real canvas and rebuilds when stage map changes',()=>{
  const env=environment(),saved=globalThis.document;
  let allocations=0;
  globalThis.document={createElement(name){
    assert.equal(name,'canvas');allocations++;
    return {width:0,height:0,getContext(){return fakeCanvas().ctx;}};
  }};
  try{
    const landscape=createLandscape(env),world=level(1);
    landscape.draw(world,.1,false);
    landscape.draw(world,.3,false);
    assert.equal(allocations,1,'static terrain must not be redrawn every frame');
    assert.equal(env.calls.drawImage,2);
    const stage2=level(2);
    landscape.draw(stage2,.4,false);
    assert.equal(allocations,2,'new map must rebuild background cache');
    assert.ok(env.calls.drawImage>=3);
  }finally{if(saved===undefined)delete globalThis.document;else globalThis.document=saved;}
});

test('visual style uses depth geometry, palms and shaded land without image downloads',()=>{
  const env=environment();
  const land=createLandscape(env);
  land.draw(level(1),.2,true);
  assert.ok(env.calls.ellipse>12,'landscape includes decorative layered shapes');
  assert.ok(env.calls.roundRect>15,'roads and plaques are distinctly shaped');
  assert.ok(env.calls.createLinearGradient>10,'terrain colors are layered');
});

test('arrow, cannon and wind towers each render animated distinctive silhouettes',()=>{
  const base={c:2,r:2,angle:0,level:2,flash:.19,recoil:.5,sway:.7};
  for(const kind of ['arrow','cannon','wind']){
    const {ctx,calls}=fakeCanvas();
    drawTowerSprite(ctx,{...base,type:kind},160,160,1.6,false);
    assert.ok(calls.fill>10,kind+' lacks layered color fills');
    assert.ok(calls.arc>5,kind+' lacks moving mechanisms');
  }
});

test('normal, fast, heavy and boss sprites have moving parts and collision-free visual state',()=>{
  for(const kind of ['normal','fast','heavy','boss']){
    const {ctx,calls}=fakeCanvas();
    drawEnemySprite(ctx,{kind,x:100,y:120,radius:kind==='boss'?21:14,
      hp:70,maxHp:100,hit:.2,slowTime:.4,seed:.8,speed:1.4},2.7,false);
    assert.ok(calls.fill>9,kind+' lacks body/accessory layers');
    assert.ok(calls.stroke>1,kind+' lacks limbs or outlines');
  }
});

test('reduced-motion renderer produces static decorations without throwing',()=>{
  const env=environment();
  const land=createLandscape(env);
  land.draw(level(3),25,true);
  drawTowerSprite(env.ctx,{c:4,r:3,type:'wind',angle:0,level:1},288,224,25,true);
  drawEnemySprite(env.ctx,{kind:'boss',x:410,y:180,radius:21,
    hp:400,maxHp:1000,slowTime:0,seed:.5,speed:.74},25,true);
  assert.ok(env.calls.fill>15);
});
