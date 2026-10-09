// Living-creature renderer (visual-only). All anatomy and animation stays here;
// no hitboxes, paths, health, speed, or combat rules are changed.
const TAU=Math.PI*2;

// Each class has a recognisable silhouette even without its distinctive color.
// The profile describes the visual species, never its gameplay statistics.
export const CREATURE_PROFILES=Object.freeze({
  normal:Object.freeze({name:'desert-beetle',shape:'round-split-shell',limbs:6,appendage:'antennae',palette:'#c97746'}),
  fast:Object.freeze({name:'dune-runner',shape:'long-tail-and-spines',limbs:4,appendage:'tail',palette:'#855ab8'}),
  heavy:Object.freeze({name:'armored-bulwark',shape:'broad-three-plate-carapace',limbs:4,appendage:'tusks',palette:'#8d5649'}),
  boss:Object.freeze({name:'horned-titan',shape:'winged-crowned-colossus',limbs:4,appendage:'wings-and-horns',palette:'#693e62'})
});
export function creatureProfile(kind){return CREATURE_PROFILES[kind]||CREATURE_PROFILES.normal;}

function ellipse(g,x,y,rx,ry,color,angle=0){
  g.fillStyle=color;g.beginPath();
  g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),angle,0,TAU);g.fill();
}
function circle(g,x,y,r,color){g.fillStyle=color;g.beginPath();g.arc(x,y,Math.max(.1,r),0,TAU);g.fill();}
function path(g,coords,color,stroke=null){
  g.beginPath();g.moveTo(coords[0][0],coords[0][1]);
  for(let i=1;i<coords.length;i++)g.lineTo(coords[i][0],coords[i][1]);
  g.closePath();g.fillStyle=color;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=1.15;g.stroke();}
}
function stroke(g,x1,y1,x2,y2,width,color){
  g.beginPath();g.lineCap='round';g.strokeStyle=color;g.lineWidth=width;
  g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
}
function curve(g,start,c1,c2,end,width,color){
  g.beginPath();g.lineCap='round';g.strokeStyle=color;g.lineWidth=width;
  g.moveTo(...start);g.bezierCurveTo(...c1,...c2,...end);g.stroke();
}
function leg(g,sx,sy,kneeX,kneeY,footX,footY,width,color,pad){
  stroke(g,sx,sy,kneeX,kneeY,width,color);
  stroke(g,kneeX,kneeY,footX,footY,Math.max(1,width*.85),color);
  ellipse(g,footX,footY,Math.max(1.7,width*1.05),Math.max(1.15,width*.58),pad);
}
function eyes(g,placements,blink,pupil='#23383d'){
  g.save();g.scale(1,blink);
  for(const [x,y] of placements){
    ellipse(g,x,y,2.65,2.8,'#fff7e6');circle(g,x+.55,y,1.18,pupil);
    circle(g,x+.3,y-.8,.48,'#fff');
  }
  g.restore();
}
function beetle(g,t,blink){
  const stride=Math.sin(t),counter=Math.sin(t+Math.PI),breath=1+.03*Math.sin(t*.55);
  // Three articulated pairs, animated in an alternating hexapod gait.
  for(let i=0;i<3;i++){
    const x=-10+i*10,step=(i%2?counter:stride)*3.1;
    for(const side of [-1,1]){
      const sy=side*5,kneeY=side*(12+step*.3),footY=side*(16+step);
      leg(g,x,sy,x-3,kneeY,x-5,footY,2.25,'#83523c','#684638');
    }
  }
  g.save();g.scale(breath,1);
  ellipse(g,-1,0,16,12,'#9b593b');
  ellipse(g,-4,-4,11.5,7.7,'#d68c50',-.13);
  ellipse(g,-4,4,11.5,7.7,'#c4733d',.13);
  curve(g,[-13,0],[-8,-.5],[6,.5],[9,0],1.1,'#e9b47c');
  ellipse(g,-10,-5,3.1,1.45,'rgba(255,222,174,.30)');
  ellipse(g,-10,5,3.1,1.45,'rgba(255,222,174,.18)');
  g.restore();
  // Moving antennae and individually hinged mandibles are part of the head.
  ellipse(g,13,0,7,7.3,'#91553d');
  curve(g,[16,-3],[22,-6+Math.sin(t*.9)*1.6],[22,-14+Math.sin(t)*1.6],
    [25,-16+Math.sin(t)*2.3],1.6,'#d6aa79');
  curve(g,[16,3],[22,6-Math.sin(t*.8)*1.6],[22,14-Math.sin(t)*1.6],
    [25,16-Math.sin(t)*2.3],1.6,'#d6aa79');
  circle(g,25,-16+Math.sin(t)*2.3,1.6,'#f4dbaf');
  circle(g,25,16-Math.sin(t)*2.3,1.6,'#f4dbaf');
  path(g,[[18,-5],[25,-4-Math.sin(t)*1.3],[20,0]],'#6f4938');
  path(g,[[18,5],[25,4+Math.sin(t)*1.3],[20,0]],'#6f4938');
  eyes(g,[[15,-4],[15,4]],blink);
}
function runner(g,t,blink){
  const gait=Math.sin(t*1.32),opposite=Math.sin(t*1.32+Math.PI);
  const flick=Math.sin(t*.73)*5;
  // A flexible, jointed tail, always behind the forward-facing snout.
  curve(g,[-10,0],[-18,-3+flick*.5],[-25,5+flick],[-34,1+flick],4.2,'#69458f');
  curve(g,[-20,-1],[-27,3+flick*.6],[-30,3+flick],[-34,1+flick],1.2,'#c8aaeb');
  path(g,[[-32,-1+flick],[-38,2+flick],[-33,5+flick]],'#b69be4');
  // Fast front/hind strides separate from torso movement.
  leg(g,-7,4,-10,11+gait*2.3,-18,12+gait*4,2.5,'#674796','#5f4a70');
  leg(g,-7,-4,-11,-10-opposite*2,-17,-13-opposite*3.4,2.3,'#69499a','#594766');
  leg(g,7,5,12,9-opposite*2.3,17,12-opposite*4.2,2.3,'#7853a7','#5f4a70');
  leg(g,7,-4,11,-10-gait*2,18,-13-gait*4.1,2.3,'#7953a6','#5f4a70');
  const stretch=1+.055*Math.sin(t*1.32);
  g.save();g.scale(stretch,1-.025*Math.sin(t*1.32));
  path(g,[[-15,-2],[-9,-10],[3,-10],[15,-4],[20,2],[9,8],[-8,7]],
    '#855fba','#d2b6f0');
  path(g,[[-10,2],[7,3],[16,2],[8,7],[-9,5]],'#a88add');
  // Dorsal fins make the small runner identifiable from its outline.
  for(const [x,h] of [[-9,5],[-2,8],[5,6]]){
    path(g,[[x,-9],[x+3,-9-h],[x+7,-7]],'#d9c5fb');
  }
  path(g,[[14,-7],[23,-5],[27,-1],[23,5],[13,5],[9,-1]],
    '#7252a1','#e7d6ff');
  g.restore();
  eyes(g,[[17,-3.5]],blink);
  curve(g,[20,3],[23,4],[25,3],[27,2],1.05,'#403657');
}
function bulwark(g,t,blink){
  const gait=Math.sin(t*.62),opposite=Math.sin(t*.62+Math.PI);
  // Massive jointed pillars and feet move slowly but visibly.
  for(const side of [-1,1]){
    const s=side;
    leg(g,-12,s*6,-17,s*(11+gait*1.5),-21,s*(16+gait*2),4.5,'#714940','#5d4840');
    leg(g,12,s*5,18,s*(10+opposite*1.3),22,s*(16+opposite*2),4.6,'#70493e','#604f45');
  }
  ellipse(g,-3,0,20.5,15.5,'#835043');
  ellipse(g,-5,0,17,13,'#b17456');
  // Three overlapping ridged armor plates, the silhouette stays broad.
  for(let i=0;i<3;i++){
    const px=-17+i*10,y=Math.sin(t*.52+i)*.75;
    path(g,[[px-6,-11+y],[px+8,-12+y],[px+13,-4+y],
      [px+13,8+y],[px-3,12+y],[px-9,6+y]],
      i%2===0?'#887863':'#a09077','#d3b68d');
    stroke(g,px-3,-7+y,px+7,-8+y,1.25,'rgba(255,234,190,.52)');
    circle(g,px+8,5+y,1.6,'#d6bc98');
  }
  // The face lives behind an articulated iron visor.
  ellipse(g,17,0,8.5,9.5,'#72483b');
  path(g,[[12,-11],[19,-13],[25,-9],[26,-4],[14,-4]],
    '#baa17b','#edd3ab');
  path(g,[[12,11],[19,13],[25,9],[26,4],[14,4]],'#a99475','#e6c59b');
  const jaw=Math.sin(t*.73)*1.15;
  path(g,[[20,-7],[27,-9-jaw],[24,-2]],'#e5c99e');
  path(g,[[20,7],[27,9+jaw],[24,2]],'#e5c99e');
  eyes(g,[[20,-3.5],[20,3.5]],blink,'#402e32');
}
function titan(g,t,blink,motion){
  const gait=Math.sin(t*.62),wings=Math.sin(t*.67),jaw=Math.sin(t*.82);
  const flap=motion?wings:0;
  // Scythe-shaped membrane wings move independently of the torso.
  for(const side of [-1,1]){
    const s=side;
    path(g,[[-9,s*5],[-24,s*(18+flap*4)],[-25,s*(29+flap*6)],
      [-13,s*(22+flap*4)],[-6,s*12]],
      side===1?'#473147':'#55394f','#bd8c8c');
    stroke(g,-8,s*7,-23,s*(25+flap*5),1.55,'#bf9e9c');
  }
  leg(g,-12,-9,-18,-16+gait*2,-22,-20+gait*3,4.7,'#4d3349','#674957');
  leg(g,-12,9,-18,16-gait*2,-22,20-gait*3,4.7,'#55364e','#674957');
  leg(g,9,-10,14,-18-gait*2,19,-21-gait*3,4.5,'#51364b','#644b57');
  leg(g,9,10,14,17+gait*2,19,21+gait*3,4.5,'#51364b','#644b57');
  g.save();g.scale(1+.025*Math.sin(t*.49),1+.038*Math.sin(t*.45));
  ellipse(g,-3,0,20,17,'#56354f');
  ellipse(g,-5,0,15,13,'#794968');
  // Royal armor at three depths.
  path(g,[[-17,-13],[-2,-16],[11,-10],[11,-3],[-15,-3]],
    '#976781','#d4ab9c');
  path(g,[[-17,13],[-2,16],[11,10],[11,3],[-15,3]],
    '#785267','#c9978c');
  ellipse(g,-5,0,8,9,'#a67679');
  circle(g,-5,0,3.6,'#e4ad6b');
  g.restore();
  ellipse(g,15,0,10.2,11.6,'#684057');
  // Crown and large horns form a visually unique forward-pointing silhouette.
  path(g,[[13,-11],[16,-21],[21,-15],[24,-26],[27,-8]],
    '#edc481','#ffebb1');
  path(g,[[13,11],[16,21],[21,15],[24,26],[27,8]],
    '#e1b67b','#ffdfa1');
  path(g,[[12,-8],[26,-11],[30,-5],[25,-1],[12,-1]],
    '#a16b67','#ecc29b');
  path(g,[[12,8],[26,11],[30,5],[25,1],[12,1]],
    '#995b66','#e9bb92');
  eyes(g,[[19,-4],[19,4]],blink,'#392f3c');
  curve(g,[23,-2],[30,-1-jaw],[30,2+jaw],[23,3],2,'#503044');
  circle(g,22,0,2,'#e7b57e');
}

export function drawEnemySprite(ctx,e,time=0,reducedMotion=false){
  const kind=CREATURE_PROFILES[e.kind]?e.kind:'normal';
  const motion=!reducedMotion,seed=e.seed??0,speed=Math.max(.4,e.speed||1);
  const phase=seed+(motion?time*(kind==='fast'?13:kind==='heavy'?4.8:kind==='boss'?4.5:8)*Math.min(1.55,speed):0);
  const blink=motion&&Math.sin(time*1.83+seed*1.47)>.985?.14:1;
  const bounce=motion?Math.sin(phase)*(kind==='fast'?2.3:kind==='heavy'?.78:1.2):0;
  const hit=Math.max(0,e.hit||0),size=(e.radius||13)/13;
  const x=e.x,y=e.y+bounce;

  // Ground shadow remains anchored and makes bouncing bodies visibly dimensional.
  ellipse(ctx,e.x+2,e.y+Math.max(6,e.radius*.72),Math.max(10,e.radius*1.07),4.9,
    'rgba(48,35,33,.26)');
  if(kind==='fast'&&motion){
    const facing=e.facing??0;
    ctx.save();ctx.translate(x,y);ctx.rotate(facing);
    for(let i=0;i<3;i++)stroke(ctx,-17-i*4,-5+i*5,-28-i*6,-5+i*5,
      1.6,'rgba(218,198,253,'+(.14-i*.035)+')');
    ctx.restore();
  }
  if(kind==='boss'){
    const pulse=motion?Math.sin(time*2.1+seed)*2.1:0;
    ctx.strokeStyle='rgba(255,216,158,.29)';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(x,y,e.radius+6+pulse,0,TAU);ctx.stroke();
    if(motion)for(let i=0;i<3;i++){
      const a=i*TAU/3+time*.43;
      path(ctx,[[x+Math.cos(a)*(e.radius+11),y+Math.sin(a)*(e.radius+11)-3],
        [x+Math.cos(a)*(e.radius+11)+3,y+Math.sin(a)*(e.radius+11)],
        [x+Math.cos(a)*(e.radius+11),y+Math.sin(a)*(e.radius+11)+3],
        [x+Math.cos(a)*(e.radius+11)-3,y+Math.sin(a)*(e.radius+11)]],
        '#e6bc80');
    }
  }

  // All anatomy faces along the real navigation direction, including bends.
  // In the economical/reduced-motion mode no time-dependent limb motion occurs.
  ctx.save();ctx.translate(x,y);ctx.rotate(e.facing??0);
  const squeeze=motion?Math.sin(phase*.72)*.034:0;
  ctx.scale(size*(1+hit*.1+squeeze),size*(1-hit*.055-squeeze*.7));
  if(kind==='normal')beetle(ctx,phase,blink);
  else if(kind==='fast')runner(ctx,phase,blink);
  else if(kind==='heavy')bulwark(ctx,phase,blink);
  else titan(ctx,phase,blink,motion);
  if(hit>.01)ellipse(ctx,0,0,kind==='boss'?18:13,kind==='boss'?15:10,
    'rgba(255,244,206,'+Math.min(.55,hit*2.2)+')');
  ctx.restore();

  if(e.slowTime>0){
    ctx.strokeStyle='rgba(142,229,250,.83)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,e.radius+5+(motion?Math.sin(time*4)*1.2:0),0,TAU);ctx.stroke();
  }
  if(e.hp<e.maxHp){
    const ratio=Math.max(0,Math.min(1,e.hp/e.maxHp)),top=e.y-e.radius-18;
    ctx.beginPath();ctx.roundRect(e.x-18,top,36,6,2);
    ctx.fillStyle='rgba(40,35,44,.91)';ctx.fill();
    if(ratio>0){ctx.beginPath();ctx.roundRect(e.x-17,top+1,34*ratio,4,1);
      ctx.fillStyle=ratio<.38?'#ff8e81':'#98e2b5';ctx.fill();}
  }
}
