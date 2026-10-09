// Hand-drawn layered Canvas sprites. Character silhouettes communicate roles,
// and small procedural motions keep the world alive without sprite downloads.
const TAU=Math.PI*2;
const disc=(g,x,y,r,fill)=>{g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();};
const oval=(g,x,y,rx,ry,fill)=>{g.fillStyle=fill;g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);g.fill();};
const box=(g,x,y,w,h,r,fill,stroke)=>{
  g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=1.35;g.stroke();}
};
const line=(g,x1,y1,x2,y2,width,color)=>{
  g.beginPath();g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
};

export function drawTowerSprite(ctx,t,x,y,time=0,reducedMotion=false){
  const phase=reducedMotion?0:time*2.1+(t.sway??(t.c*1.7+t.r*.9));
  const recoil=(t.recoil||0)*7,flash=t.flash||0,selected=!!t._visualSelected;
  ctx.save();ctx.translate(x,y);
  // Three physical strata: ground contact, stone podium, active mechanism.
  oval(ctx,4,19,30,10,'rgba(57,40,34,.24)');
  oval(ctx,0,16,25,8,'rgba(82,57,39,.20)');
  box(ctx,-23,-21,46,44,9,'#40585b','#9cae9d');
  box(ctx,-20,-24,40,40,7,
    t.type==='arrow'?'#557f63':t.type==='wind'?'#477d8c':'#857059',
    t.type==='arrow'?'#b4d4ad':t.type==='wind'?'#a9e4ea':'#d9c099');
  ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(-16,-21,32,3);
  ctx.fillStyle='rgba(14,34,42,.2)';ctx.fillRect(-16,10,32,4);
  for(let k=0;k<4;k++){
    const angle=k*Math.PI/2;ctx.save();ctx.rotate(angle);
    box(ctx,-5,-25,10,8,2,t.type==='wind'?'#79a9ad':'#687771','#b6c5b0');
    ctx.restore();
  }
  if(t.type==='wind'){
    disc(ctx,0,0,14,'#284f66');
    disc(ctx,0,0,11,'#7cc4c6');
    ctx.save();ctx.rotate(phase*1.55);
    for(let k=0;k<3;k++){
      ctx.save();ctx.rotate(k*TAU/3);
      ctx.fillStyle=k%2?'#c8f6ed':'#94dce4';ctx.beginPath();
      ctx.moveTo(0,0);ctx.quadraticCurveTo(7,-13,17,-12);
      ctx.quadraticCurveTo(21,-4,4,5);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    disc(ctx,0,0,4,'#345c72');disc(ctx,-1,-1,1.5,'#ecffff');
    ctx.restore();
    ctx.strokeStyle='rgba(175,236,241,.45)';ctx.lineWidth=2;ctx.beginPath();
    ctx.arc(0,0,18,-Math.PI*.8,Math.PI*.45);ctx.stroke();
    if(!reducedMotion){
      for(let j=0;j<2;j++){
        ctx.strokeStyle='rgba(195,244,252,'+(.18+j*.09)+')';
        ctx.lineWidth=1.6;ctx.beginPath();
        ctx.arc(0,0,20+j*5,phase*.7+j*2,phase*.7+j*2+1.2);ctx.stroke();
      }
    }
  }else{
    disc(ctx,0,0,13,t.type==='arrow'?'#c9dba5':'#efc88e');
    ctx.save();ctx.rotate(t.angle+(reducedMotion?0:Math.sin(phase)*.018));
    ctx.translate(-recoil,0);
    if(t.type==='arrow'){
      box(ctx,-7,-5,27,10,4,'#314c3d','#8aa886');
      line(ctx,9,-12,23,0,2.4,'#ead4a0');
      line(ctx,23,0,9,12,2.4,'#ead4a0');
      line(ctx,9,-12,6,-12,2,'#c18a4c');
      line(ctx,9,12,6,12,2,'#c18a4c');
      line(ctx,9,-12,9,12,.9,'#fff7cb');
      line(ctx,4,0,28,0,2,'#fdf0c1');
      ctx.fillStyle='#ffe4ac';ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(23,-4);ctx.lineTo(23,4);ctx.closePath();ctx.fill();
    }else{
      box(ctx,-5,-9,30,18,5,'#34444b','#9ba79b');
      box(ctx,18,-5,12,10,2,'#8ea19a','#d9ddd0');
      oval(ctx,30,0,4,6,'#17252a');
      if(flash>.025)oval(ctx,33,0,6+flash*16,4+flash*10,'rgba(255,188,102,'+Math.min(.68,flash*2)+')');
      line(ctx,-3,-6,13,-6,1.2,'#d0ccb5');
    }
    ctx.restore();
  }
  // Emissive ring shows a recent shot; highlights do not modify range.
  if(flash>.015){
    ctx.strokeStyle=t.type==='wind'?'rgba(158,245,250,'+Math.min(.75,flash*2)+')':
      'rgba(255,213,134,'+Math.min(.78,flash*2)+')';
    ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,0,17+flash*11,0,TAU);ctx.stroke();
  }
  for(let i=0;i<t.level;i++){
    disc(ctx,-9+i*9,23,3.5,'#ffe1a0');disc(ctx,-10+i*9,22,1.1,'#fffbe0');
  }
  if(selected){ctx.strokeStyle='rgba(255,255,245,.65)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(0,0,29,0,TAU);ctx.stroke();}
  ctx.restore();
}

export function drawEnemySprite(ctx,e,time=0,reducedMotion=false){
  const scale=e.kind==='boss'?1.20:e.kind==='heavy'?1.06:e.kind==='fast'?.86:1;
  const phase=(reducedMotion?0:time*9*e.speed)+(e.seed??0);
  const bounce=reducedMotion?0:Math.sin(phase)*(.7+(e.kind==='fast'?.95:.4));
  const stride=reducedMotion?0:Math.sin(phase)*3;
  const blink=!reducedMotion&&Math.sin(time*1.25+(e.seed??0)*2)>.978?.17:1;
  const hit=Math.max(0,e.hit||0);
  const x=e.x,y=e.y+bounce;
  oval(ctx,x+2,y+e.radius*.69,e.radius*1.12,6.3,'rgba(53,42,34,.30)');
  // Direction-aware motion trails are decorative; actual speed stays unchanged.
  if(e.kind==='fast'&&!reducedMotion){
    ctx.save();ctx.translate(x,y);ctx.rotate(e.facing??0);ctx.lineCap='round';
    for(let j=0;j<3;j++){
      ctx.strokeStyle='rgba(216,190,251,'+(.11-j*.02)+')';
      ctx.lineWidth=2.4-j*.4;ctx.beginPath();
      ctx.moveTo(-e.radius-4-j*4,-5+j*5);
      ctx.lineTo(-e.radius-13-j*6-Math.sin(phase)*2,-6+j*5);ctx.stroke();
    }
    ctx.restore();
  }
  if(e.kind==='boss'){
    const pulse=reducedMotion?0:Math.sin(time*2.3+(e.seed??0))*2.4;
    ctx.strokeStyle='rgba(255,210,146,.24)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,e.radius+8+pulse,0,TAU);ctx.stroke();
    if(!reducedMotion){
      for(let i=0;i<4;i++){
        const a=i*TAU/4+time*.36;
        oval(ctx,x+Math.cos(a)*(e.radius+8),y+Math.sin(a)*(e.radius+8),2,1.5,
          'rgba(255,222,168,.27)');
      }
    }
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.cos(e.facing??0)*.09);ctx.scale(scale*(1+hit*.04),scale*(1-hit*.035));
  // Feet animate independently of the round body.
  const legs=e.kind==='fast'?6:4;
  for(let i=0;i<legs;i++){
    const side=i%2?1:-1,anchor=i<2?-7:7;
    const dx=side*(e.kind==='boss'?14:11);
    line(ctx,anchor*.6,5,dx,12+stride*(i%2?.38:-.38),3,
      e.kind==='boss'?'#50364d':e.kind==='heavy'?'#754b40':'#986143');
    oval(ctx,dx,12+stride*(i%2?.38:-.38),4,2.4,'#665044');
  }
  let body='#ce7f53',rim='#f5c495',accent='#b4d49f';
  if(e.kind==='fast'){body='#8964b8';rim='#d5b6f5';accent='#e5dcff';}
  if(e.kind==='heavy'){body='#98574b';rim='#d6ad83';accent='#baa386';}
  if(e.kind==='boss'){body='#66415c';rim='#e0ac7e';accent='#efca7d';}
  // Distinct appendages / gear give each enemy class a recognizable silhouette.
  if(e.kind==='fast'){
    ctx.fillStyle='#6c4f98';
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(side*4,-7);ctx.lineTo(side*10,-20);
      ctx.lineTo(side*14,-5);ctx.closePath();ctx.fill();
    }
  }
  if(e.kind==='heavy'||e.kind==='boss'){
    oval(ctx,0,4,17,12,'rgba(56,35,33,.43)');
    box(ctx,-17,-1,9,13,3,'#857968');
    box(ctx,8,-1,9,13,3,'#857968');
  }
  disc(ctx,0,0,e.radius*.82,body);
  ctx.strokeStyle=rim;ctx.lineWidth=e.kind==='boss'?2.6:1.8;
  ctx.beginPath();ctx.arc(0,0,e.radius*.82,0,TAU);ctx.stroke();
  oval(ctx,-e.radius*.23,-e.radius*.32,e.radius*.37,e.radius*.21,'rgba(255,249,214,.17)');
  if(e.kind==='heavy'){
    box(ctx,-11,-e.radius*.92,22,8,3,'#ba986f','#eed7a3');
    for(let i=0;i<3;i++)box(ctx,-8+i*8,-e.radius*.81,4,4,1,'#735343');
  }
  if(e.kind==='boss'){
    ctx.fillStyle='#efcb83';ctx.beginPath();
    ctx.moveTo(-14,-11);ctx.lineTo(-11,-22);ctx.lineTo(-4,-15);
    ctx.lineTo(0,-27);ctx.lineTo(5,-16);ctx.lineTo(11,-23);ctx.lineTo(15,-10);
    ctx.closePath();ctx.fill();
    disc(ctx,0,-14,2.5,'#e7a85c');
    ctx.strokeStyle='rgba(255,225,166,.38)';ctx.lineWidth=2;ctx.beginPath();
    ctx.arc(0,0,e.radius*.90,-1.15,1.05);ctx.stroke();
  }
  // Independent eye blinking.
  ctx.save();ctx.scale(1,blink);
  oval(ctx,-4.1,-1.9,2.9,3,'#fff4df');oval(ctx,4.1,-1.9,2.9,3,'#fff4df');
  disc(ctx,-3.6,-1.8,1.4,'#253d3b');disc(ctx,4.6,-1.8,1.4,'#253d3b');
  ctx.restore();
  ctx.strokeStyle=e.kind==='boss'?'#f0c2a0':'#684638';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,4,4.5,.16*Math.PI,.83*Math.PI);ctx.stroke();
  if(hit>.01){disc(ctx,0,0,e.radius*.79,'rgba(255,242,217,'+Math.min(.52,hit*2.5)+')');}
  ctx.restore();
  if(e.slowTime>0){
    ctx.strokeStyle='rgba(147,237,250,.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,e.radius+5+Math.sin(time*5)*1.2,0,TAU);ctx.stroke();
    for(let k=0;k<3;k++){
      disc(ctx,x+Math.cos(time*1.7+k*TAU/3)*(e.radius+8),
        y+Math.sin(time*1.7+k*TAU/3)*(e.radius+8),1.7,'#c9faff');
    }
  }
  if(e.hp<e.maxHp){
    const px=x-18,py=y-e.radius*scale-18;
    box(ctx,px,py,36,6,2,'rgba(37,40,46,.90)');
    box(ctx,px+1,py+1,34*Math.max(0,e.hp/e.maxHp),4,1,
      e.hp/e.maxHp<.36?'#f28d79':'#8cd9aa');
  }
}
