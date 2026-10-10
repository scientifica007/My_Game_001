import test from 'node:test';
import assert from 'node:assert/strict';
import {createAmbience} from '../src/ambience.js';
import {PATHS} from '../src/config.js';
import {readFileSync} from 'node:fs';

function ctxFactory(){
  const calls={drawImage:0,ellipse:0,stroke:0,fill:0,gradient:0};
  const data={
    createRadialGradient(){calls.gradient++;return {addColorStop(){}};},
    createLinearGradient(){calls.gradient++;return {addColorStop(){}};},
    drawImage(){calls.drawImage++;},
    ellipse(){calls.ellipse++;},
    stroke(){calls.stroke++;},
    fill(){calls.fill++}
  };
  const ctx=new Proxy(data,{get:(v,k)=>k in v?v[k]:()=>{},set(v,k,x){v[k]=x;return true;}});
  return {ctx,calls};
}
function stage(n){return {level:n,PATH:PATHS[n-1]};}
const params={W:768,H:512,center:(c,r)=>({x:(c+.5)*64,y:(r+.5)*64})};

test('ambient light caches its image and invalidates only on stage change',()=>{
  const original=globalThis.document;
  let created=0;
  globalThis.document={createElement(tag){assert.equal(tag,'canvas');created++;return {getContext(){return ctxFactory().ctx;}}}};
  try{
    const {ctx,calls}=ctxFactory(),a=createAmbience({...params,ctx});
    a.background(stage(1),0);
    a.background(stage(1),1.5);
    assert.equal(created,1,'lighting should be rendered once per stage');
    assert.equal(calls.drawImage,2);
    a.background(stage(2),2);
    assert.equal(created,2,'lighting changes when the map level changes');
    a.background(stage(3),3);
    assert.equal(created,3);
  }finally{
    if(original===undefined)delete globalThis.document;
    else globalThis.document=original;
  }
});

test('visual quality toggle suppresses costly particles and heat waves',()=>{
  const {ctx,calls}=ctxFactory(),a=createAmbience({...params,ctx});
  a.foreground(stage(2),3,{rich:false});
  assert.equal(calls.ellipse,0);
  assert.equal(calls.stroke,0);
  a.foreground(stage(2),3,{rich:true});
  assert.ok(calls.ellipse>=9);
  assert.ok(calls.stroke>=3);
});

test('system reduce-motion preference disables moving particles',()=>{
  const {ctx,calls}=ctxFactory(),a=createAmbience({...params,ctx});
  a.foreground(stage(3),5,{rich:true,reducedMotion:true});
  assert.equal(calls.ellipse,0);
  a.foreground(stage(3),5,{rich:true,reducedMotion:false});
  assert.ok(calls.ellipse>=12);
});

test('scene and graphical quality controls remain decoupled from combat logic',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const renderer=readFileSync(new URL('../src/renderer.js',import.meta.url),'utf8');
  assert.match(html,/id="qualityBtn"/);
  assert.match(js,/oasis-defenders-visual-quality/);
  assert.match(js,/setQuality\(quality\)/);
  assert.match(renderer,/ambience\.background/);
  assert.match(renderer,/ambience\.foreground/);
  assert.doesNotMatch(renderer,/world\.gold\s*=|world\.life\s*=|world\.level\s*=/);
});
