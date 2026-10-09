export function createUI({world,$,cfg,LEVELS,WAVES,TOTAL_WAVES,LEVEL_NAMES,active,localWave,towerLimit,upgradeCost}){
function msg(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(world.toastTimeout);world.toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),2200)}

function showOverlay(icon,title,text,btn){$('modalIcon').textContent=icon;$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalBtn').textContent=btn;$('overlay').classList.remove('hidden')}

function updateUI(){
 $('speedBtn').textContent='⚡ السرعة ×'+world.speed;$('speedBtn').setAttribute('aria-pressed',String(world.speed===2));
 $('goldValue').textContent=world.gold;$('lifeValue').textContent=world.life+' ♥';$('levelValue').textContent=world.level+' / '+LEVELS;$('waveValue').textContent=localWave()+' / '+WAVES;$('killsValue').textContent=world.kills;
 const ready=world.state==='ready',battle=world.state==='battle',paused=world.state==='paused';
 $('waveBtn').disabled=!ready;$('waveBtn').textContent=world.wave===0?'▶ الموجة الأولى':world.wave===TOTAL_WAVES?'اكتملت الحملة':'▶ الموجة '+(localWave()+1);
 $('pauseBtn').disabled=!(battle||paused);$('pauseBtn').textContent=paused?'▶ متابعة':'Ⅱ إيقاف';
 $('phaseLabel').textContent=world.state==='intro'?'البداية':ready?'وقت البناء · '+LEVEL_NAMES[world.level-1]:battle?'المعركة · '+LEVEL_NAMES[world.level-1]:paused?'متوقفة مؤقتًا':world.state==='intermission'?'بين المستويات':world.state==='won'?'انتصار':'خسارة';
 $('progressFill').style.width=world.state==='won'?'100%':world.state==='battle'||world.state==='paused'?Math.round(100*(world.spawned-world.enemies.length)/Math.max(1,world.spawnMax))+'%':'0%';
 $('progressText').textContent=ready?'المستوى '+world.level+' · لديك '+world.towers.length+' من '+towerLimit()+' أبراج. وزّعها أو ارفع مستواها.':battle||paused?'أعداء في الطريق: '+world.enemies.length+' · لم يظهروا بعد: '+spawnLeft:'انتهت هذه الجولة.';
 const t=world.selectedTower,usable=active()&&world.state!=='paused';
 $('selectedName').textContent=t?(t.type==='arrow'?'برج السهام':t.type==='wind'?'برج الرياح':'برج القذائف'):'لا يوجد';
 if(t){$('towerInfo').textContent='المستوى '+t.level+' / 3 · الضرر '+(cfg[t.type].damage+(t.level-1)*(t.type==='arrow'?18:t.type==='wind'?6:32))+' · '+(t.type==='arrow'?'هجوم سريع':t.type==='wind'?'إبطاء '+Math.round(100*Math.min(.65,.35+.1*(t.level-1)))+'٪ لمدة '+(1.65+.4*(t.level-1)).toFixed(2)+' ثوانٍ (الثقيل يقاوم جزئيًا)':'ضرر جماعي');$('upgradeBtn').textContent=t.level>=3?'أقصى مستوى':'⬆ ترقية '+upgradeCost(t)+' ◈'}else{$('towerInfo').textContent='اضغط على برج في الخريطة للاطلاع على تفاصيله وترقيته. اختيار نوع برج جديد يُلغي تحديد المبنى.';$('upgradeBtn').textContent='⬆ ترقية'}
 $('upgradeBtn').disabled=!usable||!t||t.level>=3||world.gold<upgradeCost(t);$('sellBtn').disabled=!usable||!t;
 $('arrowBtn').disabled=!active()||world.state==='paused';$('cannonBtn').disabled=!active()||world.state==='paused';$('windBtn').disabled=!active()||world.state==='paused';
}
return {msg,showOverlay,updateUI};
}
