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

// Creature anatomy lives in its own module; preserve the public sprite API.
export {drawEnemySprite,creatureProfile,CREATURE_PROFILES} from './creatures.js';
