// Static, cached desert terrain plus inexpensive, animated atmospheric layers.
// Nothing here changes routes, collisions, enemy statistics, or economy.
// Road colors are deliberately more luminous than the buildable terrain,
// so the enemy path stays legible at game scale in all three stages.
export const ROAD_THEMES=Object.freeze([
  Object.freeze({frame:'#FFF0D2',road:'#F1DEB8',inner1:'#E4C89B',inner2:'#C89D6B',
    shadow:'rgba(75,49,30,.34)',outline:'rgba(100,68,39,.48)',highlight:'rgba(255,252,231,.64)'}),
  Object.freeze({frame:'#FBE9DA',road:'#EACFB6',inner1:'#D8AD88',inner2:'#B98361',
    shadow:'rgba(74,43,35,.35)',outline:'rgba(101,62,46,.52)',highlight:'rgba(255,244,229,.66)'}),
  Object.freeze({frame:'#F3EAF1',road:'#DDD0D8',inner1:'#C7B0BF',inner2:'#9F8598',
    shadow:'rgba(47,39,56,.38)',outline:'rgba(76,54,78,.51)',highlight:'rgba(255,245,255,.65)'}),
  Object.freeze({frame:'#FFEBD3',road:'#F2D4B7',inner1:'#E2BC9C',inner2:'#BA8D6D',
    shadow:'rgba(80,43,29,.36)',outline:'rgba(107,62,45,.52)',highlight:'rgba(255,245,214,.70)'}),
  Object.freeze({frame:'#F8F1E7',road:'#E6DDD1',inner1:'#D0C3BF',inner2:'#A59EAB',
    shadow:'rgba(48,43,61,.43)',outline:'rgba(70,59,87,.60)',highlight:'rgba(255,255,239,.73)'})
]);
export function createLandscape({ctx,W,H,C,COLS,ROWS,rand,center}) {
  let cache = null, cacheKey = '';
  const tau = Math.PI * 2;
  const paintGradient = (g,x1,y1,x2,y2,stops) => {
    const gradient = g.createLinearGradient(x1,y1,x2,y2);
    if (!gradient || typeof gradient.addColorStop !== 'function') return stops[0][1];
    for (const [position,color] of stops) gradient.addColorStop(position,color);
    return gradient;
  };
  const ellipse=(g,x,y,rx,ry,fill)=>{
    g.fillStyle=fill;g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,tau);g.fill();
  };
  const round=(g,x,y,w,h,r,fill)=>{
    g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();
  };
  function drawPlant(g,x,y,scale,phase) {
    g.save();g.translate(x,y);g.scale(scale,scale);
    ellipse(g,2,4,12,4,'rgba(67,53,31,.18)');
    g.lineWidth=2;g.lineCap='round';g.strokeStyle='#526b4a';
    for(let i=-1;i<=1;i++){
      g.beginPath();g.moveTo(i*2,2);g.quadraticCurveTo(i*6,-8,i*6+Math.sin(phase+i)*3,-13-Math.abs(i)*3);g.stroke();
    }
    g.fillStyle='#91aa69';
    for(let i=0;i<3;i++){g.beginPath();g.ellipse(i*6-6,-8,3.3,1.5,i*.4,0,tau);g.fill();}
    g.restore();
  }
  function drawRock(g,x,y,scale) {
    ellipse(g,x+4,y+5,12*scale,5*scale,'rgba(74,53,38,.18)');
    g.fillStyle='#8b806d';g.beginPath();g.moveTo(x-11*scale,y+2*scale);
    g.lineTo(x-7*scale,y-9*scale);g.lineTo(x+3*scale,y-12*scale);
    g.lineTo(x+11*scale,y-4*scale);g.lineTo(x+12*scale,y+3*scale);g.closePath();g.fill();
    g.fillStyle='#c0ae8e';g.beginPath();g.moveTo(x-7*scale,y-9*scale);
    g.lineTo(x+3*scale,y-12*scale);g.lineTo(x+5*scale,y-2*scale);
    g.lineTo(x-11*scale,y+2*scale);g.closePath();g.fill();
  }
  function paintTerrain(g,world) {
    const shades=[
      {a:'#d1b68a',b:'#d9c095',c:'#bb986b',d:'#c5a478',road:'#e8cf9f',inner1:'#dac08f',inner2:'#c8a674'},
      {a:'#c6a37f',b:'#ceaf8c',c:'#a98367',d:'#b58f6e',road:'#dfbd95',inner1:'#d5b18b',inner2:'#bb9677'},
      {a:'#af9aa0',b:'#bba5a1',c:'#8c7a81',d:'#a08b8c',road:'#dbbfaa',inner1:'#d0af9d',inner2:'#b59894'},
      {a:'#bba083',b:'#c5a98c',c:'#997b64',d:'#ad8e75',road:'#e9c5a3',inner1:'#d8ad8c',inner2:'#b38464'},
      {a:'#888996',b:'#a4a3ae',c:'#6c7080',d:'#858995',road:'#dfd5d0',inner1:'#c9c0bf',inner2:'#a299a8'}
    ][Math.max(0,Math.min(4,world.level-1))];
    const road=ROAD_THEMES[Math.max(0,Math.min(4,world.level-1))];
    g.fillStyle=shades.c;g.fillRect(0,0,W,H);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const x=c*C,y=r*C,k=rand(c+1,r+1),isPath=world.pathSet.has(c+','+r);
      g.fillStyle=paintGradient(g,x,y,x+C,y+C,
        [[0,(c+r)%2?shades.a:shades.b],[1,(c+r)%2?shades.c:shades.d]]);
      g.fillRect(x,y,C,C);
      g.fillStyle='rgba(255,245,214,.085)';g.fillRect(x,y,C,6);
      g.strokeStyle='rgba(119,85,52,.075)';g.strokeRect(x+.5,y+.5,C,C);
      // Wind-carved ripples create a readable terrain texture without noise images.
      g.strokeStyle='rgba(121,92,57,.15)';g.lineWidth=1;
      for(let n=0;n<2;n++){
        const sy=y+16+n*17+(k*7);
        g.beginPath();g.moveTo(x+5,sy);
        g.quadraticCurveTo(x+24,sy-7+k*4,x+53,sy);g.stroke();
      }
      if(isPath)continue;
      if(k>.77)drawRock(g,x+16+30*rand(c+17,r),y+16+27*rand(c,r+5),.56+rand(c,r+1)*.32);
      else if(k>.49)drawPlant(g,x+16+30*rand(c,r+14),y+18+29*rand(c+4,r),.7+rand(c+1,r+6)*.37,k*6);
      if(k<.12){
        ellipse(g,x+24,y+29,3,2,'rgba(132,100,64,.32)');
        ellipse(g,x+34,y+37,2,1.5,'rgba(132,100,64,.23)');
      }
    }
    // Sun haze occupies the atmospheric layer while keeping cells readable.
    g.save();g.globalAlpha=world.level===3?.12:.17;
    ellipse(g,668,54,41,37,'#fff2c9');
    ellipse(g,668,54,66,59,'rgba(255,236,188,.29)');
    g.restore();
    // Far dunes and transparent mountain silhouettes: spatial depth without
    // obscuring actionable cells or path outlines.
    g.save();g.globalAlpha=.10;g.fillStyle='#806d68';
    g.beginPath();g.moveTo(0,71);g.lineTo(53,25);g.lineTo(110,64);
    g.lineTo(206,7);g.lineTo(292,70);g.lineTo(395,28);g.lineTo(475,76);
    g.lineTo(558,14);g.lineTo(654,70);g.lineTo(732,29);g.lineTo(W,60);
    g.lineTo(W,104);g.lineTo(0,104);g.closePath();g.fill();g.restore();
    g.save();g.globalAlpha=.12;g.fillStyle='#e3c98e';
    g.beginPath();g.moveTo(0,94);g.bezierCurveTo(125,38,266,135,394,96);
    g.bezierCurveTo(515,55,635,131,W,83);g.lineTo(W,146);g.lineTo(0,146);g.fill();
    g.restore();
    // High-contrast stone road: a dark contact shadow, ivory rim and warm
    // textured paving. The three layers remain cached with the terrain.
    for(const [c,r] of world.PATH){
      if(c<0||c>=COLS||r<0||r>=ROWS)continue;
      const x=c*C,y=r*C,k=rand(c+9,r+15);
      round(g,x+2,y+4,C-3,C-3,11,road.shadow);
      round(g,x+1,y+1,C-2,C-2,10,road.frame);
      g.beginPath();g.roundRect(x+1.5,y+1.5,C-3,C-3,9);
      g.strokeStyle=road.outline;g.lineWidth=1.7;g.stroke();
      round(g,x+5,y+6,C-10,C-11,7,road.road);
      round(g,x+7,y+9,C-14,C-17,6,
        paintGradient(g,x,y,x+C,y+C,[[0,road.inner1],[1,road.inner2]]));
      g.fillStyle='rgba(255,251,229,.24)';g.fillRect(x+11,y+11,C-22,3);
      ellipse(g,x+17+24*k,y+19+24*k,2.5,1.7,'rgba(255,238,198,.70)');
      ellipse(g,x+25+14*k,y+37-14*k,3,1.9,'rgba(98,66,43,.27)');
    }
    // A continuous dotted guide remains readable around every turn.
    g.save();g.lineCap='round';g.lineJoin='round';
    g.strokeStyle='rgba(90,63,42,.30)';g.lineWidth=5;g.beginPath();
    world.PATH.forEach(([c,r],i)=>{const p=center(c,r);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});
    g.stroke();
    g.strokeStyle=road.highlight;g.lineWidth=2.4;g.setLineDash([6,9]);
    g.stroke();g.restore();
    // The oasis is a distinctive physical location at the end of each level.
    const exit=center(...world.PATH[world.PATH.length-2]);
    drawOasisBase(g,exit.x+8,exit.y);
    const entry=center(...world.PATH[1]);
    round(g,2,entry.y-15,53,20,9,'rgba(22,49,58,.88)');
    g.font='bold 11px Tahoma';g.textAlign='center';g.fillStyle='#ffebc9';
    g.fillText('الدخول',28,entry.y-1);
  }
  function drawOasisBase(g,x,y){
    ellipse(g,x,y+4,37,30,'rgba(55,71,51,.42)');
    ellipse(g,x,y,34,28,'#47765b');
    ellipse(g,x,y,29,25,'#c9b48a');
    const water=paintGradient(g,x-20,y-20,x+25,y+25,
      [[0,'#abf0df'],[.5,'#69bfbe'],[1,'#326f83']]);
    ellipse(g,x,y,24,20,water);
    for(const [ox,oy] of [[-29,-9],[29,-6],[17,22]]){
      ellipse(g,x+ox,y+oy+5,7,3,'rgba(52,60,35,.23)');
      ellipse(g,x+ox,y+oy,7,5,'#6c995a');
    }
  }
  function drawPalm(g,x,y,t,seed){
    g.save();g.translate(x,y);
    const sway=Math.sin(t*1.35+seed)*2.6;
    g.strokeStyle='#604d35';g.lineWidth=5;g.lineCap='round';g.beginPath();
    g.moveTo(0,6);g.quadraticCurveTo(-3,-13,sway,-27);g.stroke();
    g.strokeStyle='#c5a56a';g.lineWidth=1.1;g.beginPath();g.moveTo(-1,2);
    g.quadraticCurveTo(-4,-16,sway-1,-24);g.stroke();
    g.translate(sway,-27);
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3,leafSway=Math.sin(t*1.9+seed+i)*.085;
      g.save();g.rotate(angle+leafSway);
      g.fillStyle=i%2?'#457c56':'#61a06b';g.beginPath();
      g.moveTo(-2,1);g.quadraticCurveTo(12,-10,27,-4);
      g.quadraticCurveTo(15,6,-2,3);g.fill();
      g.strokeStyle='rgba(187,224,144,.35)';g.lineWidth=1;
      g.beginPath();g.moveTo(1,0);g.lineTo(21,-3);g.stroke();
      g.restore();
    }
    ellipse(g,0,0,4,4,'#977647');g.restore();
  }
  function drawAtmosphere(world,time,reducedMotion){
    const t=reducedMotion?0:time,exit=center(...world.PATH[world.PATH.length-2]),x=exit.x+8,y=exit.y;
    // Decorative plants belong to the oasis, never to buildable cells.
    drawPalm(ctx,x-28,y-6,t,.4);drawPalm(ctx,x+25,y-7,t,1.8);
    ctx.save();ctx.strokeStyle='rgba(211,255,244,.48)';ctx.lineWidth=1.15;
    for(let k=0;k<3;k++){
      ctx.beginPath();ctx.ellipse(x-4,y+1,(6+k*6)+(reducedMotion?0:Math.sin(t*1.7+k)*1.6),
        2.2+k*3,0,0,tau);ctx.stroke();
    }
    ctx.restore();
    if(reducedMotion)return;
    // Slow drifting dust; no costly randomness or particle allocation per frame.
    for(let i=0;i<15;i++){
      const dx=(i*89+t*(5+i%3)*3)%W,dy=21+(i*71)%(H-30);
      const opacity=.035+.025*Math.sin(t*.7+i*2);
      ellipse(ctx,dx,dy,2+(i%3),1.1,'rgba(255,244,217,'+opacity+')');
    }
  }
  function draw(world,time=0,reducedMotion=false){
    const key=world.level+':'+world.PATH.map(p=>p.join(',')).join(';');
    if(key!==cacheKey){
      cacheKey=key;cache=null;
      if(typeof document!=='undefined'&&typeof document.createElement==='function'){
        try{
          const surface=document.createElement('canvas');
          surface.width=W;surface.height=H;
          const g=surface.getContext('2d');
          if(g){paintTerrain(g,world);cache=surface;}
        }catch{cache=null;}
      }
    }
    if(cache)ctx.drawImage(cache,0,0);else paintTerrain(ctx,world);
    drawAtmosphere(world,time,reducedMotion);
  }
  return {draw};
}
