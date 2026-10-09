// Oasis Defenders: client-side game logic, UI state and Canvas renderer.
(()=>{'use strict';
const W=768,H=512,C=64,COLS=12,ROWS=8,WAVES=5,LEVELS=3,TOTAL_WAVES=WAVES*LEVELS;
const PATHS=[
[[-1,4],[0,4],[1,4],[1,3],[1,2],[2,2],[3,2],[4,2],[4,3],[4,4],[4,5],[5,5],[6,5],[7,5],[7,4],[7,3],[8,3],[9,3],[10,3],[10,4],[10,5],[10,6],[11,6],[12,6]],
[[-1,3],[0,3],[1,3],[2,3],[2,4],[2,5],[3,5],[4,5],[5,5],[6,5],[6,4],[6,3],[6,2],[7,2],[8,2],[8,3],[8,4],[9,4],[10,4],[10,5],[10,6],[11,6],[12,6]],
[[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[6,3],[7,3],[8,3],[9,3],[10,3],[10,4],[10,5],[10,6],[11,6],[12,6]]
];
let PATH=PATHS[0],pathSet=new Set(PATH.map(p=>p.join(',')));
function selectMap(levelNumber){PATH=PATHS[levelNumber-1];pathSet=new Set(PATH.map(p=>p.join(',')))}
function localWave(){return wave-(level-1)*WAVES}
function towerLimit(){return [8,7,6][level-1]}
const LEVEL_NAMES=['حدود الواحة','الممر الصخري','حصار الواحة'];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const cfg={arrow:{cost:55,damage:24,rate:.49,range:2.45,sell:35},cannon:{cost:95,damage:47,rate:1.26,range:2.4,sell:60},wind:{cost:80,damage:11,rate:.83,range:2.5,sell:52}};
let gold=170,life=12,wave=0,level=1,kills=0,selected='arrow',selectedTower=null,towers=[],enemies=[],bullets=[],fx=[];
let state='intro',hover=null,spawnLeft=0,spawnIndex=0,spawnClock=0,spawnMax=0,spawned=0,last=0,toastTimeout=0,sound=true,audioCtx=null,frames=0,winCount=0,speed=1,bestScore=0;
try{winCount=+(localStorage.getItem('oasis-defenders-wins')||0);bestScore=+(localStorage.getItem('oasis-defenders-best-score')||0)}catch(e){}
const center=(c,r)=>({x:(c+.5)*C,y:(r+.5)*C});
const rand=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)};
const active=()=>state==='ready'||state==='battle'||state==='paused';
function beep(freq=440,duration=.06,shape='sine',volume=.035){if(!sound)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=shape;o.frequency.setValueAtTime(freq,audioCtx.currentTime);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}}
function msg(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),2200)}
function reset(start=true){speed=1;gold=170;life=12;wave=0;level=1;selectMap(1);kills=0;selected='arrow';selectedTower=null;towers=[];enemies=[];bullets=[];fx=[];spawnLeft=0;spawnIndex=0;spawnClock=0;spawned=0;spawnMax=0;state=start?'ready':'intro';$('overlay').classList.toggle('hidden',start);choose('arrow');updateUI()}
function showOverlay(icon,title,text,btn){$('modalIcon').textContent=icon;$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalBtn').textContent=btn;$('overlay').classList.remove('hidden')}
function choose(type){if(!active()||!cfg[type])return;selected=type;selectedTower=null;for(const [id,kind] of [['arrowBtn','arrow'],['cannonBtn','cannon'],['windBtn','wind']]){$(id).classList.toggle('selected',type===kind);$(id).setAttribute('aria-pressed',String(type===kind))}updateUI()}
function valid(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS&&!pathSet.has(c+','+r)&&!towers.some(t=>t.c===c&&t.r===r)}
function coord(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height}}
function towerAt(c,r){return towers.find(t=>t.c===c&&t.r===r)}
function clickMap(e){if(!active()||state==='paused')return;const p=coord(e),c=Math.floor(p.x/C),r=Math.floor(p.y/C),existing=towerAt(c,r);if(existing){selectedTower=existing;beep(490,.055);updateUI();return}if(!valid(c,r)){msg('لا يمكن البناء هنا');beep(160,.09);return}if(towers.length>=towerLimit()){msg('بلغت الحد الأقصى: '+towerLimit()+' أبراج. وزّع دفاعاتك أو قم بالترقية');beep(160,.09);return}if(gold<cfg[selected].cost){msg('الذهب غير كافٍ لبناء هذا البرج');beep(160,.09);return}gold-=cfg[selected].cost;const t={c,r,type:selected,level:1,cd:.15,angle:-Math.PI/2};towers.push(t);selectedTower=t;poof((c+.5)*C,(r+.5)*C,'#ffdb9c',16);beep(540,.07);setTimeout(()=>beep(750,.1),70);updateUI()}
function upgrade(){if(!selectedTower||!active()||state==='paused')return;const t=selectedTower,cost=upgradeCost(t);if(t.level>=3||gold<cost)return;gold-=cost;t.level++;poof((t.c+.5)*C,(t.r+.5)*C,'#a9f4d0',18);beep(650,.14);updateUI()}
function upgradeCost(t){return 45+t.level*25+(t.type==='cannon'?20:t.type==='wind'?8:0)}
function sell(){if(!selectedTower||!active()||state==='paused')return;const t=selectedTower,refund=Math.floor(cfg[t.type].cost*.65+(t.level-1)*25);gold+=refund;towers=towers.filter(a=>a!==t);selectedTower=null;poof((t.c+.5)*C,(t.r+.5)*C,'#ffdb9c',12);beep(340,.08);updateUI()}
function startWave(){if(state!=='ready')return;wave++;state='battle';spawnLeft=5+localWave()*3+(level-1)*3;spawnMax=spawnLeft;spawned=0;spawnIndex=0;spawnClock=.3;beep(300,.12);setTimeout(()=>beep(440,.1),115);updateUI();msg('المستوى '+level+' · الموجة '+localWave()+' بدأت!')}
function pause(){if(state==='battle'){state='paused';updateUI()}else if(state==='paused'){state='battle';updateUI()}}
function enemyBlueprint(stage,round,index,count){
 const mult=[1,1.9,3.4][stage-1],boss=round===WAVES&&index===count-1;
 let kind=boss?'boss':index%5===4?'heavy':index%3===2?'fast':'normal';
 const base={normal:36+round*9,fast:30+round*8,heavy:91+round*28,boss:210+round*65}[kind];
 const hp=Math.round(base*mult);
 const speed=({normal:1.02,fast:1.68,heavy:.74,boss:.68}[kind])+(round-1)*.08+(stage-1)*.065;
 const reward=Math.max(1,Math.round((({normal:12,fast:16,heavy:23,boss:95}[kind])+(stage-1)*2)*[1,.78,.85][stage-1]));
 return {kind,hp,maxHp:hp,speed,reward,damage:kind==='boss'?4:kind==='heavy'?2:1}
}
function spawnEnemy(){const idx=spawnIndex++,stats=enemyBlueprint(level,localWave(),idx,spawnMax),xy=center(...PATH[0]);enemies.push({...stats,progress:0,x:xy.x,y:xy.y,slowTime:0,slowStrength:0,dead:false,radius:stats.kind==='boss'?21:stats.kind==='heavy'?16:stats.kind==='fast'?10:13});spawnLeft--;spawned++}
function poof(x,y,color,n=9){for(let i=0;i<n;i++){const theta=(Math.PI*2*i/n)+Math.random()*.35,s=35+Math.random()*110;fx.push({x,y,vx:Math.cos(theta)*s,vy:Math.sin(theta)*s,t:.35+Math.random()*.45,life:.8,r:1+Math.random()*2.9,color})}}
function hurt(e,amount,attackType='arrow'){if(e.dead)return;const armoured=e.kind==='heavy'||e.kind==='boss';const multiplier=armoured?(attackType==='arrow'?.75:attackType==='wind'?.85:1):e.kind==='fast'&&attackType==='cannon'?.8:1;e.hp-=Math.max(1,Math.round(amount*multiplier));poof(e.x,e.y,e.kind==='heavy'||e.kind==='boss'?'#f9a775':'#fff0ad',3);if(e.hp<=0){e.dead=true;gold+=e.reward;kills++;poof(e.x,e.y,'#8ae6b7',12);beep(260+Math.random()*100,.045,'triangle',.018)}}
function simulate(dt){
 if(state!=='battle')return;
 spawnClock-=dt;if(spawnLeft>0&&spawnClock<=0){spawnEnemy();spawnClock=Math.max(.41,.86-localWave()*.045-(level-1)*.07)}
 for(const e of enemies){if(e.dead)continue;const slowedFor=Math.min(dt,e.slowTime);e.progress+=e.speed*(dt-slowedFor*e.slowStrength);e.slowTime=Math.max(0,e.slowTime-dt);if(e.slowTime===0)e.slowStrength=0;if(e.progress>=PATH.length-1){e.dead=true;life-=e.damage;poof(736,416,'#f9937c',12);beep(125,.15,'sawtooth');if(life<=0){life=0;lose();break}continue}
 const i=Math.floor(e.progress),f=e.progress-i,a=PATH[i],b=PATH[i+1];e.x=(a[0]+.5+(b[0]-a[0])*f)*C;e.y=(a[1]+.5+(b[1]-a[1])*f)*C}
 enemies=enemies.filter(e=>!e.dead);
 if(state!=='battle')return;
 for(const t of towers){t.cd-=dt;const x=(t.c+.5)*C,y=(t.r+.5)*C,range=(cfg[t.type].range+.11*(t.level-1))*C;
 let target=null,best=-1;for(const e of enemies){const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy>range*range)continue;if(e.progress>best){target=e;best=e.progress}}
 if(target){t.angle=Math.atan2(target.y-y,target.x-x);if(t.cd<=0){bullets.push({x,y,target,type:t.type,dmg:cfg[t.type].damage+((t.level-1)*(t.type==='arrow'?18:t.type==='wind'?6:32)),speed:t.type==='arrow'?480:t.type==='wind'?410:325,r:t.type==='cannon'?6:4,slowStrength:t.type==='wind'?Math.min(.65,.35+.1*(t.level-1)):0,slowDuration:t.type==='wind'?1.65+.4*(t.level-1):0,dead:false});t.cd=cfg[t.type].rate/(1+.1*(t.level-1));beep(t.type==='arrow'?430:125,.035,t.type==='arrow'?'triangle':'sawtooth',.008)}}}
 for(const b of bullets){if(!b.target||b.target.dead){b.dead=true;continue}const dx=b.target.x-b.x,dy=b.target.y-b.y,dist=Math.hypot(dx,dy),step=b.speed*dt;if(dist<step+9){if(b.type==='cannon'){poof(b.target.x,b.target.y,'#f4bc70',16);for(const e of enemies){if(Math.hypot(e.x-b.target.x,e.y-b.target.y)<=C*.84)hurt(e,b.dmg,b.type)}}else{hurt(b.target,b.dmg,b.type);if(b.type==='wind'&&!b.target.dead){b.target.slowStrength=Math.max(b.target.slowStrength,b.slowStrength*(b.target.kind==='boss'?.55:b.target.kind==='heavy'?.75:1));b.target.slowTime=Math.max(b.target.slowTime,b.slowDuration)}}b.dead=true}else{b.x+=dx/dist*step;b.y+=dy/dist*step}}
 bullets=bullets.filter(b=>!b.dead);enemies=enemies.filter(e=>!e.dead);
 if(spawnLeft===0&&enemies.length===0){if(wave===TOTAL_WAVES){win()}else if(localWave()===WAVES){advanceLevel()}else{state='ready';const bonus=24+localWave()*4;gold+=bonus;bullets=[];msg('نجحت! مكافأة الموجة: '+bonus+' ذهب');beep(650,.13);setTimeout(()=>beep(830,.2),140)}updateUI()}
}
function advanceLevel(){
 const savings=gold,previousLife=life;
 level++;selectMap(level);gold=Math.min(265,185+level*14+Math.floor(savings*.12));
 life=Math.min(12,life+3);towers=[];selectedTower=null;enemies=[];bullets=[];fx=[];hover=null;spawnLeft=0;
 state='intermission';updateUI();
 showOverlay('🛡️','المستوى '+level+' — '+LEVEL_NAMES[level-1],
 'خريطة جديدة وطريق أصعب، والأبراج القديمة لا تنتقل. الميزانية '+gold+' ذهب (تتضمن مكافأة ادخار محدودة)، وصحة الواحة '+life+' بعد استعادة '+(life-previousLife)+' نقاط. الحد الأقصى '+towerLimit()+' أبراج. اختر مواقع البناء بعناية.','الاستعداد للمستوى '+level);
}
function win(){state='won';const score=kills*10+life*25+gold;winCount++;bestScore=Math.max(bestScore,score);try{localStorage.setItem('oasis-defenders-wins',String(winCount));localStorage.setItem('oasis-defenders-best-score',String(bestScore))}catch(e){}showOverlay('🏆','انتصرت!','نجحت في حماية الواحة عبر المستويات الثلاثة والموجات الخمس عشرة. نتيجتك: '+score+' نقطة. أفضل نتيجة: '+bestScore+' نقطة. الانتصارات: '+winCount+'.','العب مرة أخرى');beep(700,.2);setTimeout(()=>beep(900,.28),210);updateUI()}
function lose(){state='lost';enemies=[];bullets=[];showOverlay('🌪️','سقطت الواحة','وصل الأعداء إلى الواحة قبل انتهاء الدفاع. بلغت الموجة '+wave+' وقضيت على '+kills+' عدوًا. جرّب توزيع الأبراج قرب انعطافات الطريق.','حاول مجددًا');updateUI()}
function updateUI(){
 $('speedBtn').textContent='⚡ السرعة ×'+speed;$('speedBtn').setAttribute('aria-pressed',String(speed===2));
 $('goldValue').textContent=gold;$('lifeValue').textContent=life+' ♥';$('levelValue').textContent=level+' / '+LEVELS;$('waveValue').textContent=localWave()+' / '+WAVES;$('killsValue').textContent=kills;
 const ready=state==='ready',battle=state==='battle',paused=state==='paused';
 $('waveBtn').disabled=!ready;$('waveBtn').textContent=wave===0?'▶ الموجة الأولى':wave===TOTAL_WAVES?'اكتملت الحملة':'▶ الموجة '+(localWave()+1);
 $('pauseBtn').disabled=!(battle||paused);$('pauseBtn').textContent=paused?'▶ متابعة':'Ⅱ إيقاف';
 $('phaseLabel').textContent=state==='intro'?'البداية':ready?'وقت البناء · '+LEVEL_NAMES[level-1]:battle?'المعركة · '+LEVEL_NAMES[level-1]:paused?'متوقفة مؤقتًا':state==='intermission'?'بين المستويات':state==='won'?'انتصار':'خسارة';
 $('progressFill').style.width=state==='won'?'100%':state==='battle'||state==='paused'?Math.round(100*(spawned-enemies.length)/Math.max(1,spawnMax))+'%':'0%';
 $('progressText').textContent=ready?'المستوى '+level+' · لديك '+towers.length+' من '+towerLimit()+' أبراج. وزّعها أو ارفع مستواها.':battle||paused?'أعداء في الطريق: '+enemies.length+' · لم يظهروا بعد: '+spawnLeft:'انتهت هذه الجولة.';
 const t=selectedTower,usable=active()&&state!=='paused';
 $('selectedName').textContent=t?(t.type==='arrow'?'برج السهام':t.type==='wind'?'برج الرياح':'برج القذائف'):'لا يوجد';
 if(t){$('towerInfo').textContent='المستوى '+t.level+' / 3 · الضرر '+(cfg[t.type].damage+(t.level-1)*(t.type==='arrow'?18:t.type==='wind'?6:32))+' · '+(t.type==='arrow'?'هجوم سريع':t.type==='wind'?'إبطاء '+Math.round(100*Math.min(.65,.35+.1*(t.level-1)))+'٪ لمدة '+(1.65+.4*(t.level-1)).toFixed(2)+' ثوانٍ (الثقيل يقاوم جزئيًا)':'ضرر جماعي');$('upgradeBtn').textContent=t.level>=3?'أقصى مستوى':'⬆ ترقية '+upgradeCost(t)+' ◈'}else{$('towerInfo').textContent='اضغط على برج في الخريطة للاطلاع على تفاصيله وترقيته. اختيار نوع برج جديد يُلغي تحديد المبنى.';$('upgradeBtn').textContent='⬆ ترقية'}
 $('upgradeBtn').disabled=!usable||!t||t.level>=3||gold<upgradeCost(t);$('sellBtn').disabled=!usable||!t;
 $('arrowBtn').disabled=!active()||state==='paused';$('cannonBtn').disabled=!active()||state==='paused';$('windBtn').disabled=!active()||state==='paused';
}
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawMap(){
 ctx.fillStyle='#b59b71';ctx.fillRect(0,0,W,H);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=c*C,y=r*C,k=rand(c+1,r+1);
 ctx.fillStyle=(c+r)%2?'#b6a078':'#bea680';ctx.fillRect(x,y,C,C);
 ctx.fillStyle='rgba(246,226,175,.13)';ctx.beginPath();ctx.arc(x+16+35*k,y+14+31*rand(r,c),2+2*k,0,Math.PI*2);ctx.fill();
 if(!pathSet.has(c+','+r)){
 if(k>.64){ctx.fillStyle=k>.87?'#688c59':'#819a64';ctx.beginPath();ctx.ellipse(x+9+39*k,y+14+35*rand(c,r+9),4+6*k,3+5*k,0,0,Math.PI*2);ctx.fill()}
 if(k<.24){ctx.fillStyle='#d3bb8e';ctx.beginPath();ctx.ellipse(x+9+40*k,y+15+40*rand(r+2,c+2),3.5,2.5,-.2,0,Math.PI*2);ctx.fill()}}
 ctx.strokeStyle='#a38b6834';ctx.strokeRect(x+.5,y+.5,C,C);
 }
 for(const [c,r] of PATH){if(c<0||c>=COLS||r<0||r>=ROWS)continue;const x=c*C,y=r*C;rr(x+1,y+1,C-2,C-2,7,'#ddc18b','#e9d4a5');rr(x+6,y+6,C-12,C-12,6,'#cfae76');
 ctx.fillStyle='#e9d2a0';const k=rand(c+3,r+8);ctx.beginPath();ctx.ellipse(x+15+35*k,y+20+26*k,3,2,0,0,Math.PI*2);ctx.fill()}
 ctx.save();ctx.setLineDash([5,10]);ctx.lineWidth=2;ctx.strokeStyle='#f7e4b36e';ctx.beginPath();PATH.forEach(([c,r],i)=>{const p=center(c,r);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.restore();
 // tiny water pool / oasis entrance
 ctx.save();const exit=center(...PATH[PATH.length-2]);ctx.translate(exit.x+12,exit.y);ctx.fillStyle='#295f65';ctx.beginPath();ctx.ellipse(0,1,24,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#70c4b5';ctx.beginPath();ctx.ellipse(0,0,17,21,0,0,Math.PI*2);ctx.fill();ctx.restore();
 // path start marker
 const entry=center(...PATH[1]);rr(1,entry.y-15,50,18,9,'#1c3440d9');ctx.fillStyle='#f4dec1';ctx.font='bold 11px Tahoma';ctx.textAlign='center';ctx.fillText('الدخول',26,entry.y-2);
}
function drawTowers(){for(const t of towers){const x=(t.c+.5)*C,y=(t.r+.5)*C,isSelected=selectedTower===t;
 if(isSelected){ctx.beginPath();ctx.arc(x,y,(cfg[t.type].range+.11*(t.level-1))*C,0,Math.PI*2);ctx.fillStyle='#76e2b31c';ctx.fill();ctx.strokeStyle='#d8ffe780';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([])}
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(x,y+16,26,9,0,0,Math.PI*2);ctx.fill();
 rr(x-23,y-21,46,44,8,'#3f5961','#b0c2b1');rr(x-19,y-17,38,36,6,t.type==='arrow'?'#4b7a65':t.type==='wind'?'#44798d':'#786657',t.type==='arrow'?'#a6d4ab':t.type==='wind'?'#a8e9f5':'#d9bd99');
 ctx.fillStyle=t.type==='arrow'?'#dce5b3':t.type==='wind'?'#a8e8f5':'#f3ce8a';ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(x,y);ctx.rotate(t.angle);if(t.type==='arrow'){ctx.fillStyle='#28483f';ctx.fillRect(0,-4,22,8);ctx.fillStyle='#f8e0a4';ctx.fillRect(8,-2,18,4);ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(21,-5);ctx.lineTo(21,5);ctx.fill()}else if(t.type==='wind'){ctx.strokeStyle='#ddfaff';ctx.lineWidth=4;ctx.lineCap='round';for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(0,0,11,a,a+1.1);ctx.stroke()}ctx.fillStyle='#35617b';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#4a5960';rr(-2,-7,29,14,5,'#344851','#273039');rr(17,-4,12,8,2,'#a0b3a1')}ctx.restore();
 for(let i=0;i<t.level;i++){ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(x-9+i*9,y+23,3,0,Math.PI*2);ctx.fill()}
}}
function drawEnemies(){for(const e of enemies){const x=e.x,y=e.y;ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,y+9,e.radius+1,7,0,0,Math.PI*2);ctx.fill();
 const base=e.kind==='boss'?'#693c66':e.kind==='heavy'?'#a95648':e.kind==='fast'?'#9c64bc':'#d47a55';
 ctx.fillStyle=base;ctx.strokeStyle=e.kind==='boss'?'#ffca6d':e.kind==='heavy'?'#f1ab82':'#ffe4b6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,e.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff7df';ctx.beginPath();ctx.arc(x-4,y-2,2.3,0,Math.PI*2);ctx.arc(x+4,y-2,2.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b2930';ctx.beginPath();ctx.arc(x-4,y-2,1,0,Math.PI*2);ctx.arc(x+4,y-2,1,0,Math.PI*2);ctx.fill();
 if(e.kind==='heavy'||e.kind==='boss'){ctx.fillStyle=e.kind==='boss'?'#ffd57a':'#e9c59a';ctx.fillRect(x-6,y-e.radius-2,12,4)}if(e.slowTime>0){ctx.strokeStyle='#88e1fc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,e.radius+5,0,Math.PI*2);ctx.stroke()}
 if(e.hp<e.maxHp){rr(x-17,y-e.radius-14,34,5,2,'#322e33');rr(x-16,y-e.radius-13,32*Math.max(0,e.hp/e.maxHp),3,1,e.hp/e.maxHp<.4?'#ff8f86':'#96e3b0')}
}}
function drawBullets(){for(const b of bullets){ctx.save();ctx.shadowColor=b.type==='arrow'?'#fded9a':b.type==='wind'?'#4fd9ff':'#ff9052';ctx.shadowBlur=13;ctx.fillStyle=b.type==='arrow'?'#fff3b6':b.type==='wind'?'#b5f4ff':'#ff9d5e';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore()}}
function drawFx(dt){for(const f of fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.98;f.vy*=.98;f.t-=dt;ctx.globalAlpha=Math.max(0,Math.min(1,f.t/f.life));ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;fx=fx.filter(f=>f.t>0)}
function drawHover(){if(!hover||!active()||state==='paused')return;const c=Math.floor(hover.x/C),r=Math.floor(hover.y/C);if(c<0||r<0||c>=COLS||r>=ROWS)return;const t=towerAt(c,r);if(t)return;const v=valid(c,r),x=c*C,y=r*C;rr(x+3,y+3,C-6,C-6,7,v?'#6ce8ac25':'#ff77772e',v?'#aaf3d9':'#ffb2a9');if(v){ctx.beginPath();ctx.arc(x+32,y+32,(cfg[selected].range)*C,0,Math.PI*2);ctx.strokeStyle='#ffffff50';ctx.setLineDash([8,5]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fff5d1';ctx.font='bold 24px Tahoma';ctx.textAlign='center';ctx.fillText('+',x+32,y+41)}}
function drawPause(){if(state==='paused'){ctx.fillStyle='#0e202ab8';ctx.fillRect(0,0,W,H);rr(230,193,308,126,15,'#203948e8','#80a6a0');ctx.fillStyle='#f7edcf';ctx.font='bold 30px Tahoma';ctx.textAlign='center';ctx.fillText('اللعبة متوقفة',384,244);ctx.font='15px Tahoma';ctx.fillText('اضغط «متابعة» للاستئناف',384,282)}}
function render(dt){ctx.clearRect(0,0,W,H);drawMap();drawHover();drawTowers();drawEnemies();drawBullets();drawFx(dt);drawPause()}
function frame(ms){const dt=Math.min((ms-last)/1000||0,.045);last=ms;if(state==='battle')simulate(dt*speed);render(state==='paused'?0:dt*speed);if(++frames%12===0&&state==='battle')updateUI();requestAnimationFrame(frame)}
canvas.addEventListener('pointermove',e=>{hover=coord(e)});canvas.addEventListener('pointerleave',()=>{hover=null});canvas.addEventListener('click',clickMap);
$('arrowBtn').addEventListener('click',()=>choose('arrow'));$('cannonBtn').addEventListener('click',()=>choose('cannon'));$('windBtn').addEventListener('click',()=>choose('wind'));$('waveBtn').addEventListener('click',startWave);$('pauseBtn').addEventListener('click',pause);$('upgradeBtn').addEventListener('click',upgrade);$('sellBtn').addEventListener('click',sell);$('modalBtn').addEventListener('click',()=>{if(state==='intermission'){state='ready';$('overlay').classList.add('hidden');updateUI()}else reset(true)});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;updateUI();msg('سرعة اللعب: ×'+speed)});$('resetBtn').addEventListener('click',()=>{reset(true);msg('بدأت لعبة جديدة')});$('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'🔊 الصوت':'🔇 صامت';if(sound)beep(530,.09)});
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.code==='Space')return;if(e.key==='1')choose('arrow');else if(e.key==='2')choose('cannon');else if(e.key==='3')choose('wind');else if(e.key.toLowerCase()==='p')pause();else if(e.key.toLowerCase()==='f'){$('speedBtn').click()}else if(e.code==='Space'){e.preventDefault();startWave()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='battle'){state='paused';updateUI()}});
updateUI();requestAnimationFrame(frame);
// Expose minimal diagnostic state for offline verification without changing gameplay.
window.__oasisTest=()=>({state,level,wave,localWave:localWave(),gold,life,kills,towerLimit:towerLimit(),numberOfTowers:towers.length,towerTypes:towers.map(t=>t.type),slowedEnemies:enemies.filter(e=>e.slowTime>0).length,enemies:enemies.length,spawnLeft});
})();
