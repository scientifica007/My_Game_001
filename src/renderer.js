import {createLandscape} from './landscape.js';
import {drawTowerSprite,drawEnemySprite} from './sprites.js';

// The renderer owns presentation only. Combat, health and stage progression
// remain exclusively in simulation.js and main.js.
export function createRenderer({world,ctx,W,H,C,COLS,ROWS,cfg,center,rand,active,valid,towerAt}){
  const landscape=createLandscape({ctx,W,H,C,COLS,ROWS,rand,center});
  const reducedMotion=typeof window!=='undefined'&&typeof window.matchMedia==='function'
    ?window.matchMedia('(prefers-reduced-motion: reduce)').matches:false;
  let visualTime=0;
  const TAU=Math.PI*2;
  function round(x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function drawHover(){
    if(!world.hover||!active()||world.state==='paused')return;
    const c=Math.floor(world.hover.x/C),r=Math.floor(world.hover.y/C);
    if(c<0||r<0||c>=COLS||r>=ROWS)return;
    if(towerAt(c,r))return;
    const ok=valid(c,r),x=c*C,y=r*C;
    round(x+3,y+3,C-6,C-6,7,ok?'rgba(108,232,172,.16)':'rgba(255,119,119,.22)',ok?'#aaf3d9':'#ffb2a9');
    if(ok){
      ctx.beginPath();ctx.arc(x+C/2,y+C/2,cfg[world.selected].range*C,0,TAU);
      ctx.strokeStyle='rgba(255,255,255,.30)';ctx.setLineDash([8,5]);ctx.lineWidth=1.2;
      ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fff5d1';ctx.font='bold 24px Tahoma';
      ctx.textAlign='center';ctx.fillText('+',x+C/2,y+C/2+9);
    }
  }
  function drawTowers(){
    for(const tower of world.towers){
      const x=(tower.c+.5)*C,y=(tower.r+.5)*C;
      tower._visualSelected=world.selectedTower===tower;
      if(tower._visualSelected){
        ctx.save();ctx.beginPath();
        ctx.arc(x,y,(cfg[tower.type].range+.11*(tower.level-1))*C,0,TAU);
        ctx.fillStyle='rgba(111,230,186,.065)';ctx.fill();
        ctx.strokeStyle='rgba(211,255,226,.54)';ctx.lineWidth=1.6;
        ctx.setLineDash([8,6]);ctx.stroke();ctx.restore();
      }
      drawTowerSprite(ctx,tower,x,y,visualTime,reducedMotion);
    }
  }
  function drawEnemies(){
    // On-screen ordering is stable: units at larger Y appear in front.
    const sorted=world.enemies.slice().sort((a,b)=>a.y-b.y);
    for(const enemy of sorted)drawEnemySprite(ctx,enemy,visualTime,reducedMotion);
  }
  function drawBullets(){
    for(const bullet of world.bullets){
      const prevX=bullet.px??bullet.x,prevY=bullet.py??bullet.y;
      const arrow=bullet.type==='arrow',wind=bullet.type==='wind';
      ctx.save();
      ctx.lineCap='round';
      ctx.globalAlpha=.54;ctx.strokeStyle=arrow?'#fff2c0':wind?'#a9f5ff':'#ffb279';
      ctx.lineWidth=arrow?2.2:wind?2.8:4.5;
      ctx.beginPath();ctx.moveTo(prevX,prevY);ctx.lineTo(bullet.x,bullet.y);ctx.stroke();
      ctx.globalAlpha=1;ctx.shadowColor=arrow?'#ffdf7e':wind?'#6de8ff':'#ff8349';
      ctx.shadowBlur=13;
      ctx.fillStyle=arrow?'#fff5c8':wind?'#c4faff':'#ffa86c';
      ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.r,0,TAU);ctx.fill();
      if(!arrow&&!wind){
        ctx.fillStyle='#fff6dc';ctx.beginPath();
        ctx.arc(bullet.x-1.5,bullet.y-1.5,Math.max(1,bullet.r*.31),0,TAU);ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawFx(dt){
    for(const p of world.fx){
      // Preserve the existing particle lifecycle; only their appearance changes.
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.t-=dt;
      const fraction=Math.max(0,Math.min(1,p.t/p.life));
      if(!fraction)continue;
      ctx.save();ctx.globalAlpha=fraction;
      ctx.fillStyle=p.color;ctx.beginPath();
      ctx.arc(p.x,p.y,Math.max(.1,p.r*(.75+(1-fraction)*.35)),0,TAU);ctx.fill();
      if(fraction>.5){ctx.globalAlpha=fraction*.23;ctx.beginPath();
        ctx.arc(p.x,p.y,Math.max(.1,p.r*2.1),0,TAU);ctx.fill();}
      ctx.restore();
    }
    world.fx=world.fx.filter(p=>p.t>0);
  }
  function drawPause(){
    if(world.state!=='paused')return;
    ctx.fillStyle='rgba(10,27,38,.70)';ctx.fillRect(0,0,W,H);
    round(225,190,318,132,17,'rgba(27,54,69,.94)','#88b9af');
    ctx.textAlign='center';ctx.fillStyle='#fff3d6';
    ctx.font='bold 30px Tahoma';ctx.fillText('اللعبة متوقفة',384,246);
    ctx.font='15px Tahoma';ctx.fillText('اضغط «متابعة» للاستئناف',384,285);
  }
  function render(dt=0){
    if(Number.isFinite(dt))visualTime+=Math.max(0,dt);
    ctx.clearRect(0,0,W,H);
    landscape.draw(world,visualTime,reducedMotion);
    drawHover();
    drawTowers();
    drawEnemies();
    drawBullets();
    drawFx(dt);
    drawPause();
  }
  return {render};
}
