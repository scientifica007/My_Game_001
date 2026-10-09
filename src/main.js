import {W,H,C,COLS,ROWS,WAVES,LEVELS,TOTAL_WAVES,PATHS,LEVEL_NAMES,cfg} from './config.js';
import {upgradeCost,sellRefund,stageBudget} from './economy.js';
import {createSimulation} from './simulation.js';
import {createRenderer} from './renderer.js';
import {createUI} from './ui.js';
// Oasis Defenders: client-side game logic, UI state and Canvas renderer.
(()=>{'use strict';
let PATH=PATHS[0],pathSet=new Set(PATH.map(p=>p.join(',')));
function selectMap(levelNumber){PATH=PATHS[levelNumber-1];pathSet=new Set(PATH.map(p=>p.join(',')))}
function localWave(){return wave-(level-1)*WAVES}
function towerLimit(){return [8,7,6][level-1]}
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let gold=170,life=12,wave=0,level=1,kills=0,selected='arrow',selectedTower=null,towers=[],enemies=[],bullets=[],fx=[];
let state='intro',hover=null,spawnLeft=0,spawnIndex=0,spawnClock=0,spawnMax=0,spawned=0,last=0,toastTimeout=0,sound=true,audioCtx=null,frames=0,winCount=0,speed=1,bestScore=0;
try{winCount=+(localStorage.getItem('oasis-defenders-wins')||0);bestScore=+(localStorage.getItem('oasis-defenders-best-score')||0)}catch(e){}
const center=(c,r)=>({x:(c+.5)*C,y:(r+.5)*C});
const rand=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)};
const active=()=>state==='ready'||state==='battle'||state==='paused';
function beep(freq=440,duration=.06,shape='sine',volume=.035){if(!sound)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=shape;o.frequency.setValueAtTime(freq,audioCtx.currentTime);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}}

function reset(start=true){speed=1;gold=170;life=12;wave=0;level=1;selectMap(1);kills=0;selected='arrow';selectedTower=null;towers=[];enemies=[];bullets=[];fx=[];spawnLeft=0;spawnIndex=0;spawnClock=0;spawned=0;spawnMax=0;state=start?'ready':'intro';$('overlay').classList.toggle('hidden',start);choose('arrow');updateUI()}

function choose(type){if(!active()||!cfg[type])return;selected=type;selectedTower=null;for(const [id,kind] of [['arrowBtn','arrow'],['cannonBtn','cannon'],['windBtn','wind']]){$(id).classList.toggle('selected',type===kind);$(id).setAttribute('aria-pressed',String(type===kind))}updateUI()}
function valid(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS&&!pathSet.has(c+','+r)&&!towers.some(t=>t.c===c&&t.r===r)}
function coord(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height}}
function towerAt(c,r){return towers.find(t=>t.c===c&&t.r===r)}
function clickMap(e){if(!active()||state==='paused')return;const p=coord(e),c=Math.floor(p.x/C),r=Math.floor(p.y/C),existing=towerAt(c,r);if(existing){selectedTower=existing;beep(490,.055);updateUI();return}if(!valid(c,r)){msg('لا يمكن البناء هنا');beep(160,.09);return}if(towers.length>=towerLimit()){msg('بلغت الحد الأقصى: '+towerLimit()+' أبراج. وزّع دفاعاتك أو قم بالترقية');beep(160,.09);return}if(gold<cfg[selected].cost){msg('الذهب غير كافٍ لبناء هذا البرج');beep(160,.09);return}gold-=cfg[selected].cost;const t={c,r,type:selected,level:1,cd:.15,angle:-Math.PI/2,sway:Math.random()*Math.PI*2,flash:0,recoil:0};towers.push(t);selectedTower=t;poof((c+.5)*C,(r+.5)*C,'#ffdb9c',16);beep(540,.07);setTimeout(()=>beep(750,.1),70);updateUI()}
function upgrade(){if(!selectedTower||!active()||state==='paused')return;const t=selectedTower,cost=upgradeCost(t);if(t.level>=3||gold<cost)return;gold-=cost;t.level++;poof((t.c+.5)*C,(t.r+.5)*C,'#a9f4d0',18);beep(650,.14);updateUI()}

function sell(){if(!selectedTower||!active()||state==='paused')return;const t=selectedTower,refund=sellRefund(t,cfg);gold+=refund;towers=towers.filter(a=>a!==t);selectedTower=null;poof((t.c+.5)*C,(t.r+.5)*C,'#ffdb9c',12);beep(340,.08);updateUI()}
function startWave(){if(state!=='ready')return;wave++;state='battle';spawnLeft=5+localWave()*3+(level-1)*3;spawnMax=spawnLeft;spawned=0;spawnIndex=0;spawnClock=.3;beep(300,.12);setTimeout(()=>beep(440,.1),115);updateUI();msg('المستوى '+level+' · الموجة '+localWave()+' بدأت!')}
function pause(){if(state==='battle'){state='paused';updateUI()}else if(state==='paused'){state='battle';updateUI()}}


function poof(x,y,color,n=9){for(let i=0;i<n;i++){const theta=(Math.PI*2*i/n)+Math.random()*.35,s=35+Math.random()*110;fx.push({x,y,vx:Math.cos(theta)*s,vy:Math.sin(theta)*s,t:.35+Math.random()*.45,life:.8,r:1+Math.random()*2.9,color})}}


function advanceLevel(){
 // A stage may be unlocked only by clearing its final wave alive.
 // Never derive progression solely from the absence of enemies.
 if(state!=='battle'||life<=0||level>=LEVELS||
    localWave()!==WAVES||spawnLeft!==0||enemies.length!==0)return false;
 const savings=gold,previousLife=life;
 level++;selectMap(level);gold=stageBudget(level,savings);
 life=Math.min(12,life+3);towers=[];selectedTower=null;enemies=[];bullets=[];fx=[];hover=null;spawnLeft=0;
 state='intermission';updateUI();
 showOverlay('🛡️','المستوى '+level+' — '+LEVEL_NAMES[level-1],
 'خريطة جديدة وطريق أصعب، والأبراج القديمة لا تنتقل. الميزانية '+gold+' ذهب (تتضمن مكافأة ادخار محدودة)، وصحة الواحة '+life+' بعد استعادة '+(life-previousLife)+' نقاط. الحد الأقصى '+towerLimit()+' أبراج. اختر مواقع البناء بعناية.','الاستعداد للمستوى '+level);
 return true;
}
function win(){if(state!=='battle'||life<=0||wave!==TOTAL_WAVES||spawnLeft!==0||enemies.length!==0)return false;state='won';const score=kills*10+life*25+gold;winCount++;bestScore=Math.max(bestScore,score);try{localStorage.setItem('oasis-defenders-wins',String(winCount));localStorage.setItem('oasis-defenders-best-score',String(bestScore))}catch(e){}showOverlay('🏆','انتصرت!','نجحت في حماية الواحة عبر المستويات الثلاثة والموجات الخمس عشرة. نتيجتك: '+score+' نقطة. أفضل نتيجة: '+bestScore+' نقطة. الانتصارات: '+winCount+'.','العب مرة أخرى');beep(700,.2);setTimeout(()=>beep(900,.28),210);updateUI();return true}
function lose(){if(state==='lost'||state==='won')return false;state='lost';enemies=[];bullets=[];showOverlay('🌪️','سقطت الواحة','وصل الأعداء إلى الواحة قبل انتهاء الدفاع. بلغت الموجة '+wave+' وقضيت على '+kills+' عدوًا. جرّب توزيع الأبراج قرب انعطافات الطريق.','حاول مجددًا');updateUI();return true}










function frame(ms){const dt=Math.min((ms-last)/1000||0,.045);last=ms;if(state==='battle')simulate(dt*speed);render(state==='paused'?0:dt*speed);if(++frames%12===0&&state==='battle')updateUI();requestAnimationFrame(frame)}
const world={
  get gold(){return gold}, set gold(value){gold=value},
  get life(){return life}, set life(value){life=value},
  get wave(){return wave}, set wave(value){wave=value},
  get level(){return level}, set level(value){level=value},
  get kills(){return kills}, set kills(value){kills=value},
  get selected(){return selected}, set selected(value){selected=value},
  get selectedTower(){return selectedTower}, set selectedTower(value){selectedTower=value},
  get towers(){return towers}, set towers(value){towers=value},
  get enemies(){return enemies}, set enemies(value){enemies=value},
  get bullets(){return bullets}, set bullets(value){bullets=value},
  get fx(){return fx}, set fx(value){fx=value},
  get state(){return state}, set state(value){state=value},
  get hover(){return hover}, set hover(value){hover=value},
  get spawnLeft(){return spawnLeft}, set spawnLeft(value){spawnLeft=value},
  get spawnIndex(){return spawnIndex}, set spawnIndex(value){spawnIndex=value},
  get spawnClock(){return spawnClock}, set spawnClock(value){spawnClock=value},
  get spawnMax(){return spawnMax}, set spawnMax(value){spawnMax=value},
  get spawned(){return spawned}, set spawned(value){spawned=value},
  get last(){return last}, set last(value){last=value},
  get toastTimeout(){return toastTimeout}, set toastTimeout(value){toastTimeout=value},
  get sound(){return sound}, set sound(value){sound=value},
  get audioCtx(){return audioCtx}, set audioCtx(value){audioCtx=value},
  get frames(){return frames}, set frames(value){frames=value},
  get winCount(){return winCount}, set winCount(value){winCount=value},
  get speed(){return speed}, set speed(value){speed=value},
  get bestScore(){return bestScore}, set bestScore(value){bestScore=value},
  get PATH(){return PATH}, set PATH(value){PATH=value},
  get pathSet(){return pathSet}, set pathSet(value){pathSet=value}
};
const {msg,showOverlay,updateUI}=createUI({world,$,cfg,LEVELS,WAVES,TOTAL_WAVES,LEVEL_NAMES,active,localWave,towerLimit,upgradeCost});
const {simulate}=createSimulation({world,C,WAVES,TOTAL_WAVES,center,cfg,localWave,beep,poof,win,lose,advanceLevel,updateUI,msg});
const {render,setQuality}=createRenderer({world,ctx,W,H,C,COLS,ROWS,cfg,center,rand,active,valid,towerAt});
let quality='rich';
try{quality=localStorage.getItem('oasis-defenders-visual-quality')==='lite'?'lite':'rich'}catch{}
setQuality(quality);
function syncQualityButton(){
 $('qualityBtn').textContent=quality==='rich'?'✨ مؤثرات غنيّة':'🌿 مؤثرات اقتصادية';
 $('qualityBtn').setAttribute('aria-pressed',String(quality==='rich'));
}
syncQualityButton();

canvas.addEventListener('pointermove',e=>{hover=coord(e)});canvas.addEventListener('pointerleave',()=>{hover=null});canvas.addEventListener('click',clickMap);
$('arrowBtn').addEventListener('click',()=>choose('arrow'));$('cannonBtn').addEventListener('click',()=>choose('cannon'));$('windBtn').addEventListener('click',()=>choose('wind'));$('waveBtn').addEventListener('click',startWave);$('pauseBtn').addEventListener('click',pause);$('upgradeBtn').addEventListener('click',upgrade);$('sellBtn').addEventListener('click',sell);$('modalBtn').addEventListener('click',()=>{if(state==='intermission'){state='ready';$('overlay').classList.add('hidden');updateUI()}else reset(true)});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;updateUI();msg('سرعة اللعب: ×'+speed)});
$('qualityBtn').addEventListener('click',()=>{
 quality=quality==='rich'?'lite':'rich';setQuality(quality);syncQualityButton();
 try{localStorage.setItem('oasis-defenders-visual-quality',quality)}catch{}
 msg(quality==='rich'?'تم تفعيل مؤثرات الإضاءة والغلاف الجوي':'تم تفعيل المؤثرات الاقتصادية لتخفيف الحمل');
});$('resetBtn').addEventListener('click',()=>{reset(true);msg('بدأت لعبة جديدة')});$('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'🔊 الصوت':'🔇 صامت';if(sound)beep(530,.09)});
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.code==='Space')return;if(e.key==='1')choose('arrow');else if(e.key==='2')choose('cannon');else if(e.key==='3')choose('wind');else if(e.key.toLowerCase()==='p')pause();else if(e.key.toLowerCase()==='f'){$('speedBtn').click()}else if(e.code==='Space'){e.preventDefault();startWave()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='battle'){state='paused';updateUI()}});
updateUI();requestAnimationFrame(frame);
// Expose minimal diagnostic state for offline verification without changing gameplay.
window.__oasisTest=()=>({state,level,wave,localWave:localWave(),gold,life,kills,towerLimit:towerLimit(),numberOfTowers:towers.length,towerTypes:towers.map(t=>t.type),slowedEnemies:enemies.filter(e=>e.slowTime>0).length,enemies:enemies.length,spawnLeft});
})();
