// Ambient scene lighting and weather, fully decorative and deterministic.
// No gameplay mutation, downloaded textures, or time-dependent allocations.
const TAU = Math.PI * 2;
const SCENES = [
  { name:'morning', haze:'#fff2c2', glow:'#fff6d7', particle:'#fdf1c4', intensity:.25 },
  { name:'canyon',  haze:'#e8bd91', glow:'#ffe2b6', particle:'#fae3b2', intensity:.18 },
  { name:'dusk',    haze:'#b3abdf', glow:'#ddd4ff', particle:'#ddd5ff', intensity:.29 }
];

export function createAmbience({ctx,W,H,center}){
  let lightCache=null, lightLevel=0;
  const oval=(x,y,rx,ry,fill,rotation=0)=>{
    ctx.fillStyle=fill;ctx.beginPath();
    ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);
    ctx.fill();
  };
  const gradient=(x,y,r,color)=>{
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    if(!g||typeof g.addColorStop!=='function')return color;
    g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
    return g;
  };
  function buildLight(level){
    if(lightLevel===level&&lightCache)return;
    lightLevel=level;lightCache=null;
    if(typeof document==='undefined'||typeof document.createElement!=='function')return;
    try {
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const c=canvas.getContext('2d');
      if(!c)return;
      let color;
      if(level===1)color='rgba(255,247,204,.24)';
      else if(level===2)color='rgba(236,173,119,.19)';
      else color='rgba(145,143,226,.21)';
      const g=c.createLinearGradient(0,0,W,H);
      if(!g||typeof g.addColorStop!=='function')return;
      g.addColorStop(0,color);
      g.addColorStop(.55,'rgba(255,255,255,0)');
      g.addColorStop(1,'rgba(12,33,45,.14)');
      c.fillStyle=g;c.fillRect(0,0,W,H);
      lightCache=canvas;
    }catch{lightCache=null;}
  }
  function background(world,time,{rich=true,reducedMotion=false}={}){
    const scene=SCENES[Math.max(0,Math.min(2,(world.level||1)-1))];
    const t=reducedMotion?0:time;
    buildLight(world.level);
    ctx.save();
    if(lightCache){
      ctx.globalAlpha=.82+(reducedMotion?0:Math.sin(t*.45)*.065);
      ctx.drawImage(lightCache,0,0);
    }
    if(!rich){ctx.restore();return;}
    // Translucent bands imply wind, depth and environmental scale.
    for(let i=0;i<3;i++){
      const y=48+i*158+(reducedMotion?0:Math.sin(t*.28+i)*6);
      ctx.lineWidth=18+i*4;
      ctx.strokeStyle=world.level===3?'rgba(171,168,230,.045)':'rgba(253,224,178,.058)';
      ctx.beginPath();
      ctx.moveTo(-45,y+13);
      ctx.bezierCurveTo(W*.22,y-21,W*.55,y+29,W+32,y-9);
      ctx.stroke();
    }
    // A few soft light puddles, behind units and not obscuring the road.
    const exit=center(...world.PATH[world.PATH.length-2]);
    const ex=exit.x+8,ey=exit.y;
    ctx.globalAlpha=world.level===3?.27:.17;
    oval(ex,ey,63,48,gradient(ex,ey,75,scene.glow));
    ctx.restore();
  }

  function foreground(world,time,{rich=true,reducedMotion=false}={}){
    if(!rich||reducedMotion)return;
    const level=world.level||1,t=time,scene=SCENES[Math.max(0,Math.min(2,level-1))];
    ctx.save();
    // Distant floating dust in the morning; sunlit sand in the canyon;
    // sparse fireflies and embers in the dusky final level.
    const count=level===3?12:9;
    const speed=level===2?13:level===3?3.8:6.7;
    for(let i=0;i<count;i++){
      const seed=i*1.61803398;
      const x=(i*73.97+t*speed*(1+i%3))%(W+26)-13;
      const y=19+(i*67.41)%(H-34)+Math.sin(t*(.5+i%3*.2)+seed)*5.8;
      const radius=level===3?(1.1+i%3*.55):(.8+i%3*.47);
      const alpha=(level===3?.27:.11)+(.05*Math.sin(t*1.7+seed));
      oval(x,y,radius,radius*.67,'rgba('+
        (level===3?'211,207,255':level===2?'247,212,153':'255,240,200')+
        ','+Math.max(.02,alpha)+')');
      if(level===3&&i%4===0){
        oval(x,y,5.5,5.5,gradient(x,y,7,'rgba(211,206,255,.17)'));
      }
    }
    if(level===2){
      // Heat ripples in canyon: restrained and away from crisp UI text.
      ctx.strokeStyle='rgba(255,229,191,.10)';ctx.lineWidth=1.3;
      for(let i=0;i<3;i++){
        const x=95+i*216,y=110+(i%2)*260;
        ctx.beginPath();ctx.moveTo(x,y+13);
        ctx.bezierCurveTo(x+7+Math.sin(t*.9+i)*4,y+7,
          x-4+Math.sin(t+i)*3,y-1,x+3,y-13);ctx.stroke();
      }
    }
    if(level===3){
      const exit=center(...world.PATH[world.PATH.length-2]);
      ctx.strokeStyle='rgba(220,204,255,'+(.19+.05*Math.sin(t*1.3))+')';
      ctx.lineWidth=1.4;ctx.beginPath();
      ctx.ellipse(exit.x+8,exit.y,32+Math.sin(t*.8)*2,27,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
  return {background,foreground};
}
