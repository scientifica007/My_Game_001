export function upgradeCost(t){return 45+t.level*25+(t.type==='cannon'?20:t.type==='wind'?8:0)}
export function sellRefund(t,cfg){return Math.floor(cfg[t.type].cost*.65+(t.level-1)*25)}
export function stageBudget(level,savings){
 if(level===4)return Math.min(345,260+Math.floor(savings*.12));
 if(level===5)return Math.min(370,285+Math.floor(savings*.12));
 return Math.min(265,185+level*14+Math.floor(savings*.12));
}
export function waveBonus(round,stage=1){return 24+round*4+(stage===4?12:stage===5?17:0)}
