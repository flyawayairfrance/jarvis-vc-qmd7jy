'use strict';
function recommend(acct){let r,d,m,why;
 if(acct<2000){r=.5;d=1.5;m=2;why='Small account: protect capital while you build consistency.'}
 else if(acct<25000){r=1;d=3;m=4;why='Standard tier: 1% risk means 3 full losses hit the daily stop.'}
 else if(acct<100000){r=.85;d=2.5;m=4;why='Larger account: slightly under 1% keeps dollar drawdowns manageable.'}
 else{r=.5;d=2;m=3;why='Big account: dollar swings get emotional, so keep % risk small.'}
 const days=[...new Set(trades.map(t=>bkDate(new Date(t.t))))].sort().slice(-5);
 const stopHit=days.some(dy=>trades.filter(t=>bkDate(new Date(t.t))==dy).reduce((a,t)=>a+t.pnl,0)<=-acct*S.stop/100);
 let streak=0;for(let i=trades.length-1;i>=0&&trades[i].pnl<0;i--)streak++;
 if(stopHit){r/=2;d=+(d*.67).toFixed(1);m=Math.max(1,m-1);why+=' Daily stop hit in the last 5 trading days, so risk is halved.'}
 else if(streak>=3){r*=.5;m=Math.max(1,m-1);why+=` ${streak} losses in a row, so risk is halved until you get a winner.`}
 else if(streak==2){r*=.75;why+=' 2 losses in a row, so risk is cut 25%.'}
 r=+r.toFixed(2);return{r,d,m,why,usd:acct*r/100,dusd:acct*d/100}}
function renderRec(){const a=+document.getElementById('sAcct').value||0,el=document.getElementById('rec');if(!a){el.innerHTML='<span class="muted">Enter account size for a recommendation.</span>';return}
 const x=recommend(a);el.innerHTML=`<b>Recommended for ${money(a)}</b><br>Risk per trade: ${x.r}% = ${money(x.usd)}<br>Daily stop: ${x.d}% = ${money(x.dusd)}<br>Max trades/day: ${x.m}<br>Profit target per session: prime ${(x.r*1.5).toFixed(2)}% = ${money(x.usd*1.5)} · other ${x.r}% = ${money(x.usd)}<div class="muted">Why: ${esc(x.why)}</div><button id="recApply" style="margin-top:6px">Apply recommendation</button>`;
 document.getElementById('recApply').onclick=()=>{document.getElementById('sRisk').value=x.r;document.getElementById('sStop').value=x.d;document.getElementById('sMax').value=x.m;document.getElementById('sSave').click()}}
document.getElementById('sAcct').addEventListener('input',renderRec);
const _rr=renderRisk;renderRisk=function(){_rr();renderRec()};renderRec();
