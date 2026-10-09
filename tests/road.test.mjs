import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandscape,ROAD_THEMES} from '../src/landscape.js';
import {PATHS} from '../src/config.js';

const rgb=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
function brightness(hex){
  const channels=rgb(hex).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b){
  const l1=brightness(a),l2=brightness(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
function fakeCanvas(){
  const fills=[],strokes=[];
  const target={fillStyle:null,strokeStyle:null};
  target.fill=()=>fills.push(target.fillStyle);
  target.stroke=()=>strokes.push(target.strokeStyle);
  target.createLinearGradient=()=>({addColorStop(){}});
  const ctx=new Proxy(target,{get(obj,key){return key in obj?obj[key]:(()=>{});},
    set(obj,key,value){obj[key]=value;return true;}});
  return {ctx,fills,strokes};
}
function scene(stage){
  const PATH=PATHS[stage-1];
  return {level:stage,PATH,pathSet:new Set(PATH.map(([c,r])=>c+','+r))};
}
const params={W:768,H:512,C:64,COLS:12,ROWS:8,
  rand:(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a);},
  center:(c,r)=>({x:(c+.5)*64,y:(r+.5)*64})};

test('each map has a distinct high-contrast road palette',()=>{
  assert.equal(ROAD_THEMES.length,3);
  const sand=['#d9c095','#ceaf8c','#bba5a1'];
  const rimColors=new Set();
  ROAD_THEMES.forEach((palette,i)=>{
    assert.ok(contrast(palette.frame,sand[i])>=1.5,
      'level '+(i+1)+' road rim must stand apart from sand');
    assert.ok(contrast(palette.frame,palette.inner2)>=1.6,
      'level '+(i+1)+' must show a visible bevel around road paving');
    assert.notEqual(palette.outline,palette.shadow);
    rimColors.add(palette.frame);
  });
  assert.equal(rimColors.size,3);
});

test('all maps paint conspicuous rims, outlined road tiles, and a center guide',()=>{
  for(let stage=1;stage<=3;stage++){
    const {ctx,fills,strokes}=fakeCanvas();
    const land=createLandscape({ctx,...params});
    const before=JSON.stringify(scene(stage));
    const world=scene(stage);
    land.draw(world,.3,true);
    const palette=ROAD_THEMES[stage-1];
    assert.ok(fills.includes(palette.frame),'level '+stage+' lost its bright path rim');
    assert.ok(fills.includes(palette.road),'level '+stage+' lost its colored road bed');
    assert.ok(fills.includes(palette.shadow),'level '+stage+' lost its grounding shadow');
    assert.ok(strokes.includes(palette.outline),'level '+stage+' lost its tile outlines');
    assert.ok(strokes.includes(palette.highlight),'level '+stage+' lost the directional guide');
    assert.equal(JSON.stringify(world),before,'road painter must not mutate stage geometry');
  }
});

test('road palette is completely decoupled from campaign balance',()=>{
  for(const p of ROAD_THEMES)assert.ok(Object.isFrozen(p));
  assert.ok(Object.isFrozen(ROAD_THEMES));
});
