export function upgradeCost(t){return 45+t.level*25+(t.type==='cannon'?20:t.type==='wind'?8:0)}
export function sellRefund(t,cfg){return Math.floor(cfg[t.type].cost*.65+(t.level-1)*25)}
export function stageBudget(level,savings){return Math.min(265,185+level*14+Math.floor(savings*.12))}
export function waveBonus(round){return 24+round*4}
