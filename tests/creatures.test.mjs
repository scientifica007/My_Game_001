import test from 'node:test';
import assert from 'node:assert/strict';
import {drawEnemySprite,creatureProfile,CREATURE_PROFILES} from '../src/sprites.js';

function canvasTrace(){
  const commands=[];
  const geometryMethods=new Set([
    'beginPath','arc','ellipse','moveTo','lineTo','quadraticCurveTo',
    'bezierCurveTo','closePath','roundRect','translate','rotate','scale'
  ]);
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      return (...args)=>{if(geometryMethods.has(key))commands.push([key,...args.map(x=>typeof x==='number'?+x.toFixed(4):x)]);};
    },
    set(target,key,value){target[key]=value;return true;}
  });
  return {ctx,commands};
}
function enemy(kind){
  return {kind,x:110,y:95,radius:{normal:13,fast:10,heavy:16,boss:21}[kind],
    speed:{normal:1.1,fast:1.9,heavy:.8,boss:.7}[kind],
    hp:90,maxHp:90,slowTime:0,hit:0,seed:.63,facing:.9};
}
function geometry(kind,time,quiet=false){
  const {ctx,commands}=canvasTrace();
  const e=enemy(kind);
  drawEnemySprite(ctx,e,time,quiet);
  return JSON.stringify(commands);
}

test('four enemies are visually distinct species, not recolored circles',()=>{
  const types=['normal','fast','heavy','boss'];
  assert.equal(Object.keys(CREATURE_PROFILES).length,4);
  const signatures=new Set(types.map(kind=>geometry(kind,1.37,true)));
  assert.equal(signatures.size,4,'static silhouettes must differ');
  assert.equal(new Set(types.map(x=>creatureProfile(x).shape)).size,4);
  assert.equal(new Set(types.map(x=>creatureProfile(x).appendage)).size,4);
  assert.equal(creatureProfile('normal').limbs,6);
  assert.equal(creatureProfile('fast').limbs,4);
  assert.equal(creatureProfile('heavy').limbs,4);
  assert.equal(creatureProfile('boss').limbs,4);
});

test('limbs, antennae, tail, armor and boss wings move at fixed enemy position',()=>{
  for(const kind of ['normal','fast','heavy','boss']){
    const before=geometry(kind,.3,false),after=geometry(kind,1.1,false);
    assert.notEqual(before,after,kind+' must animate its own shape, not just move on the map');
  }
});

test('reduce-motion and economical mode freezes all creature anatomy',()=>{
  for(const kind of ['normal','fast','heavy','boss']){
    assert.equal(geometry(kind,.3,true),geometry(kind,45,true),
      kind+' should stay stable with reduced animation');
  }
});

test('enemy painter never changes real gameplay attributes',()=>{
  for(const kind of ['normal','fast','heavy','boss']){
    const subject=enemy(kind),snapshot=JSON.stringify(subject);
    drawEnemySprite(canvasTrace().ctx,subject,12.4,false);
    assert.equal(JSON.stringify(subject),snapshot);
  }
});

test('hit reaction and wind slowdown remain visible without changing state',()=>{
  const {ctx,commands}=canvasTrace();
  const subject={...enemy('boss'),hit:.2,slowTime:1.7,hp:22,maxHp:100};
  const previous=JSON.stringify(subject);
  assert.doesNotThrow(()=>drawEnemySprite(ctx,subject,8.3,false));
  assert.ok(commands.length>120,'boss animation layers should have substantial geometry');
  assert.equal(JSON.stringify(subject),previous);
});

test('creatures face the path direction on every bend',()=>{
  const right={ctx:canvasTrace().ctx,commands:[]};
  const initial=enemy('fast');
  const a=canvasTrace(),b=canvasTrace();
  drawEnemySprite(a.ctx,{...initial,facing:0},.7,true);
  drawEnemySprite(b.ctx,{...initial,facing:Math.PI/2},.7,true);
  assert.notEqual(JSON.stringify(a.commands),JSON.stringify(b.commands));
  assert.ok(b.commands.some(op=>op[0]==='rotate'&&Math.abs(op[1]-Math.PI/2)<.01));
});
