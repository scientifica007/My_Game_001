export function createRenderer({world,ctx,W,H,C,COLS,ROWS,cfg,center,rand,active,valid,towerAt}){
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}

function drawMap(){
 ctx.fillStyle='#b59b71';ctx.fillRect(0,0,W,H);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=c*C,y=r*C,k=rand(c+1,r+1);
 ctx.fillStyle=(c+r)%2?'#b6a078':'#bea680';ctx.fillRect(x,y,C,C);
 ctx.fillStyle='rgba(246,226,175,.13)';ctx.beginPath();ctx.arc(x+16+35*k,y+14+31*rand(r,c),2+2*k,0,Math.PI*2);ctx.fill();
 if(!world.pathSet.has(c+','+r)){
 if(k>.64){ctx.fillStyle=k>.87?'#688c59':'#819a64';ctx.beginPath();ctx.ellipse(x+9+39*k,y+14+35*rand(c,r+9),4+6*k,3+5*k,0,0,Math.PI*2);ctx.fill()}
 if(k<.24){ctx.fillStyle='#d3bb8e';ctx.beginPath();ctx.ellipse(x+9+40*k,y+15+40*rand(r+2,c+2),3.5,2.5,-.2,0,Math.PI*2);ctx.fill()}}
 ctx.strokeStyle='#a38b6834';ctx.strokeRect(x+.5,y+.5,C,C);
 }
 for(const [c,r] of world.PATH){if(c<0||c>=COLS||r<0||r>=ROWS)continue;const x=c*C,y=r*C;rr(x+1,y+1,C-2,C-2,7,'#ddc18b','#e9d4a5');rr(x+6,y+6,C-12,C-12,6,'#cfae76');
 ctx.fillStyle='#e9d2a0';const k=rand(c+3,r+8);ctx.beginPath();ctx.ellipse(x+15+35*k,y+20+26*k,3,2,0,0,Math.PI*2);ctx.fill()}
 ctx.save();ctx.setLineDash([5,10]);ctx.lineWidth=2;ctx.strokeStyle='#f7e4b36e';ctx.beginPath();world.PATH.forEach(([c,r],i)=>{const p=center(c,r);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.restore();
 // tiny water pool / oasis entrance
 ctx.save();const exit=center(...world.PATH[world.PATH.length-2]);ctx.translate(exit.x+12,exit.y);ctx.fillStyle='#295f65';ctx.beginPath();ctx.ellipse(0,1,24,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#70c4b5';ctx.beginPath();ctx.ellipse(0,0,17,21,0,0,Math.PI*2);ctx.fill();ctx.restore();
 // path start marker
 const entry=center(...world.PATH[1]);rr(1,entry.y-15,50,18,9,'#1c3440d9');ctx.fillStyle='#f4dec1';ctx.font='bold 11px Tahoma';ctx.textAlign='center';ctx.fillText('الدخول',26,entry.y-2);
}

function drawTowers(){for(const t of world.towers){const x=(t.c+.5)*C,y=(t.r+.5)*C,isSelected=world.selectedTower===t;
 if(isSelected){ctx.beginPath();ctx.arc(x,y,(cfg[t.type].range+.11*(t.level-1))*C,0,Math.PI*2);ctx.fillStyle='#76e2b31c';ctx.fill();ctx.strokeStyle='#d8ffe780';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([])}
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(x,y+16,26,9,0,0,Math.PI*2);ctx.fill();
 rr(x-23,y-21,46,44,8,'#3f5961','#b0c2b1');rr(x-19,y-17,38,36,6,t.type==='arrow'?'#4b7a65':t.type==='wind'?'#44798d':'#786657',t.type==='arrow'?'#a6d4ab':t.type==='wind'?'#a8e9f5':'#d9bd99');
 ctx.fillStyle=t.type==='arrow'?'#dce5b3':t.type==='wind'?'#a8e8f5':'#f3ce8a';ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(x,y);ctx.rotate(t.angle);if(t.type==='arrow'){ctx.fillStyle='#28483f';ctx.fillRect(0,-4,22,8);ctx.fillStyle='#f8e0a4';ctx.fillRect(8,-2,18,4);ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(21,-5);ctx.lineTo(21,5);ctx.fill()}else if(t.type==='wind'){ctx.strokeStyle='#ddfaff';ctx.lineWidth=4;ctx.lineCap='round';for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(0,0,11,a,a+1.1);ctx.stroke()}ctx.fillStyle='#35617b';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#4a5960';rr(-2,-7,29,14,5,'#344851','#273039');rr(17,-4,12,8,2,'#a0b3a1')}ctx.restore();
 for(let i=0;i<t.level;i++){ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(x-9+i*9,y+23,3,0,Math.PI*2);ctx.fill()}
}}

function drawEnemies(){for(const e of world.enemies){const x=e.x,y=e.y;ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,y+9,e.radius+1,7,0,0,Math.PI*2);ctx.fill();
 const base=e.kind==='boss'?'#693c66':e.kind==='heavy'?'#a95648':e.kind==='fast'?'#9c64bc':'#d47a55';
 ctx.fillStyle=base;ctx.strokeStyle=e.kind==='boss'?'#ffca6d':e.kind==='heavy'?'#f1ab82':'#ffe4b6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,e.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff7df';ctx.beginPath();ctx.arc(x-4,y-2,2.3,0,Math.PI*2);ctx.arc(x+4,y-2,2.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b2930';ctx.beginPath();ctx.arc(x-4,y-2,1,0,Math.PI*2);ctx.arc(x+4,y-2,1,0,Math.PI*2);ctx.fill();
 if(e.kind==='heavy'||e.kind==='boss'){ctx.fillStyle=e.kind==='boss'?'#ffd57a':'#e9c59a';ctx.fillRect(x-6,y-e.radius-2,12,4)}if(e.slowTime>0){ctx.strokeStyle='#88e1fc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,e.radius+5,0,Math.PI*2);ctx.stroke()}
 if(e.hp<e.maxHp){rr(x-17,y-e.radius-14,34,5,2,'#322e33');rr(x-16,y-e.radius-13,32*Math.max(0,e.hp/e.maxHp),3,1,e.hp/e.maxHp<.4?'#ff8f86':'#96e3b0')}
}}

function drawBullets(){for(const b of world.bullets){ctx.save();ctx.shadowColor=b.type==='arrow'?'#fded9a':b.type==='wind'?'#4fd9ff':'#ff9052';ctx.shadowBlur=13;ctx.fillStyle=b.type==='arrow'?'#fff3b6':b.type==='wind'?'#b5f4ff':'#ff9d5e';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore()}}

function drawFx(dt){for(const f of world.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.98;f.vy*=.98;f.t-=dt;ctx.globalAlpha=Math.max(0,Math.min(1,f.t/f.life));ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;world.fx=world.fx.filter(f=>f.t>0)}

function drawHover(){if(!world.hover||!active()||world.state==='paused')return;const c=Math.floor(world.hover.x/C),r=Math.floor(world.hover.y/C);if(c<0||r<0||c>=COLS||r>=ROWS)return;const t=towerAt(c,r);if(t)return;const v=valid(c,r),x=c*C,y=r*C;rr(x+3,y+3,C-6,C-6,7,v?'#6ce8ac25':'#ff77772e',v?'#aaf3d9':'#ffb2a9');if(v){ctx.beginPath();ctx.arc(x+32,y+32,(cfg[world.selected].range)*C,0,Math.PI*2);ctx.strokeStyle='#ffffff50';ctx.setLineDash([8,5]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fff5d1';ctx.font='bold 24px Tahoma';ctx.textAlign='center';ctx.fillText('+',x+32,y+41)}}

function drawPause(){if(world.state==='paused'){ctx.fillStyle='#0e202ab8';ctx.fillRect(0,0,W,H);rr(230,193,308,126,15,'#203948e8','#80a6a0');ctx.fillStyle='#f7edcf';ctx.font='bold 30px Tahoma';ctx.textAlign='center';ctx.fillText('اللعبة متوقفة',384,244);ctx.font='15px Tahoma';ctx.fillText('اضغط «متابعة» للاستئناف',384,282)}}

function render(dt){ctx.clearRect(0,0,W,H);drawMap();drawHover();drawTowers();drawEnemies();drawBullets();drawFx(dt);drawPause()}
return {render};
}
