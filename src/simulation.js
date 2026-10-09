import {enemyBlueprint} from './levels.js';
import {waveBonus} from './economy.js';
export function createSimulation({world,C,WAVES,TOTAL_WAVES,center,cfg,localWave,beep,poof,win,lose,advanceLevel,updateUI,msg}){
function spawnEnemy(){const idx=world.spawnIndex++,stats=enemyBlueprint(world.level,localWave(),idx,world.spawnMax),xy=center(...world.PATH[0]);world.enemies.push({...stats,progress:0,x:xy.x,y:xy.y,slowTime:0,slowStrength:0,seed:Math.random()*Math.PI*2,hit:0,dead:false,radius:stats.kind==='boss'?21:stats.kind==='heavy'?16:stats.kind==='fast'?10:13});world.spawnLeft--;world.spawned++}

function hurt(e,amount,attackType='arrow'){if(e.dead)return;const armoured=e.kind==='heavy'||e.kind==='boss';const multiplier=armoured?(attackType==='arrow'?.75:attackType==='wind'?.85:1):e.kind==='fast'&&attackType==='cannon'?.8:1;e.hp-=Math.max(1,Math.round(amount*multiplier));e.hit=.22;poof(e.x,e.y,e.kind==='heavy'||e.kind==='boss'?'#f9a775':'#fff0ad',3);if(e.hp<=0){e.dead=true;world.gold+=e.reward;world.kills++;poof(e.x,e.y,'#8ae6b7',12);beep(260+Math.random()*100,.045,'triangle',.018)}}

function simulate(dt){
 if(world.state!=='battle')return;
 // Defeat is terminal. A zero-health oasis must never complete a wave.
 if(world.life<=0){world.life=0;lose();return;}
 world.spawnClock-=dt;if(world.spawnLeft>0&&world.spawnClock<=0){spawnEnemy();world.spawnClock=Math.max(.41,.86-localWave()*.045-(world.level-1)*.07)}
 for(const e of world.enemies){if(e.dead)continue;e.hit=Math.max(0,(e.hit||0)-dt);const slowedFor=Math.min(dt,e.slowTime);e.progress+=e.speed*(dt-slowedFor*e.slowStrength);e.slowTime=Math.max(0,e.slowTime-dt);if(e.slowTime===0)e.slowStrength=0;if(e.progress>=world.PATH.length-1){e.dead=true;world.life-=e.damage;poof(736,416,'#f9937c',12);beep(125,.15,'sawtooth');if(world.life<=0){world.life=0;lose();break}continue}
 const i=Math.floor(e.progress),f=e.progress-i,a=world.PATH[i],b=world.PATH[i+1];e.x=(a[0]+.5+(b[0]-a[0])*f)*C;e.y=(a[1]+.5+(b[1]-a[1])*f)*C}
 world.enemies=world.enemies.filter(e=>!e.dead);
 if(world.state!=='battle')return;
 for(const t of world.towers){t.flash=Math.max(0,(t.flash||0)-dt);t.recoil=Math.max(0,(t.recoil||0)-dt*2.5);t.cd-=dt;const x=(t.c+.5)*C,y=(t.r+.5)*C,range=(cfg[t.type].range+.11*(t.level-1))*C;
 let target=null,best=-1;for(const e of world.enemies){const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy>range*range)continue;if(e.progress>best){target=e;best=e.progress}}
 if(target){t.angle=Math.atan2(target.y-y,target.x-x);if(t.cd<=0){world.bullets.push({x,y,px:x,py:y,target,type:t.type,dmg:cfg[t.type].damage+((t.level-1)*(t.type==='arrow'?18:t.type==='wind'?6:32)),speed:t.type==='arrow'?480:t.type==='wind'?410:325,r:t.type==='cannon'?6:4,slowStrength:t.type==='wind'?Math.min(.65,.35+.1*(t.level-1)):0,slowDuration:t.type==='wind'?1.65+.4*(t.level-1):0,dead:false});t.flash=.23;t.recoil=1;t.cd=cfg[t.type].rate/(1+.1*(t.level-1));beep(t.type==='arrow'?430:125,.035,t.type==='arrow'?'triangle':'sawtooth',.008)}}}
 for(const b of world.bullets){if(!b.target||b.target.dead){b.dead=true;continue}const dx=b.target.x-b.x,dy=b.target.y-b.y,dist=Math.hypot(dx,dy),step=b.speed*dt;b.px=b.x;b.py=b.y;if(dist<step+9){if(b.type==='cannon'){poof(b.target.x,b.target.y,'#f4bc70',16);for(const e of world.enemies){if(Math.hypot(e.x-b.target.x,e.y-b.target.y)<=C*.84)hurt(e,b.dmg,b.type)}}else{hurt(b.target,b.dmg,b.type);if(b.type==='wind'&&!b.target.dead){b.target.slowStrength=Math.max(b.target.slowStrength,b.slowStrength*(b.target.kind==='boss'?.55:b.target.kind==='heavy'?.75:1));b.target.slowTime=Math.max(b.target.slowTime,b.slowDuration)}}b.dead=true}else{b.x+=dx/dist*step;b.y+=dy/dist*step}}
 world.bullets=world.bullets.filter(b=>!b.dead);world.enemies=world.enemies.filter(e=>!e.dead);
 // Re-check the result after damage and projectile updates. A cleared board
 // alone is not a victory: the player must still be alive and in battle.
 if(world.state!=='battle')return;
 if(world.life<=0){world.life=0;lose();return}
 if(world.spawnLeft===0&&world.enemies.length===0){if(world.wave===TOTAL_WAVES){win()}else if(localWave()===WAVES){advanceLevel()}else{world.state='ready';const bonus=waveBonus(localWave());world.gold+=bonus;world.bullets=[];msg('نجحت! مكافأة الموجة: '+bonus+' ذهب');beep(650,.13);setTimeout(()=>beep(830,.2),140)}updateUI()}
}
return {simulate};
}
