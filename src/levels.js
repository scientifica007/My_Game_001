import {WAVES} from './config.js';
function enemyBlueprint(stage,round,index,count){
 const mult=[1,1.9,3.4][stage-1],boss=round===WAVES&&index===count-1;
 let kind=boss?'boss':index%5===4?'heavy':index%3===2?'fast':'normal';
 const base={normal:36+round*9,fast:30+round*8,heavy:91+round*28,boss:210+round*65}[kind];
 const hp=Math.round(base*mult);
 const speed=({normal:1.02,fast:1.68,heavy:.74,boss:.68}[kind])+(round-1)*.08+(stage-1)*.065;
 const reward=Math.max(1,Math.round((({normal:12,fast:16,heavy:23,boss:95}[kind])+(stage-1)*2)*[1,.78,.85][stage-1]));
 return {kind,hp,maxHp:hp,speed,reward,damage:kind==='boss'?4:kind==='heavy'?2:1}
}
export {enemyBlueprint};
