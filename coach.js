'use strict';
// Trade coach: rule-based mistake detection + mini chart. Candles: Binance (crypto, keyless, CORS ok); else Yahoo via fetch (often blocked) -> level-only chart.
const candleCache={};
function binSym(s){s=s.toUpperCase().replace(/^.*:/,'').replace(/[\/\-]/g,'');if(/^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA)(USDT?|USD)$/.test(s))return s.replace(/USDT?$/,'USDT');return null}
async function candles(t){const k=t.id;if(candleCache[k]!==undefined)return candleCache[k];let out=null;const st=t.t-90*6e4,en=t.t+90*6e4;
 try{const b=binSym(t.sym);if(b){const r=await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${b}&interval=5m&startTime=${st}&endTime=${en}`);if(r.ok)out=(await r.json()).map(c=>({t:c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4]}))}
 else if(Date.now()-t.t<55*864e5){const y=t.sym.replace(/^.*:/,'');const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?interval=5m&period1=${Math.floor(st/1e3)}&period2=${Math.floor(en/1e3)}`);if(r.ok){const j=(await r.json()).chart.result[0],q=j.indicators.quote[0];out=j.timestamp.map((ts,i)=>({t:ts*1e3,o:q.open[i],h:q.high[i],l:q.low[i],c:q.close[i]})).filter(c=>c.c!=null)}}}catch(e){}
 return candleCache[k]=out&&out.length?out:null}
function analyse(t,cs){const f=[],budget=S.acct*S.risk/100,long=!/short|sell/i.test(t.side||''),R=t.r??t.pnl/budget;
 const prev=trades.filter(x=>x.t<t.t&&bkDate(new Date(x.t))==bkDate(new Date(t.t)));const last=prev[prev.length-1];
 if(last&&last.pnl<0&&t.t-last.t<20*6e4)f.push(['revenge','Revenge trade: entered <20 min after a loss']);
 if(prev.length>=S.max)f.push(['overtrading',`Overtrading: trade #${prev.length+1} today (max ${S.max})`]);
 const ev=allEvents().find(e=>e.impact=='High'&&Math.abs(e.t-t.t)<15*6e4);if(ev)f.push(['news',`Traded into high-impact news: ${ev.title}`]);
 if(plans[bkDate(new Date(t.t))]?.length&&!nearSession(t.t))f.push(['offplan','Outside your planned sessions']);
 const rd=Math.abs(t.entry-t.stop);
 if(rd&&t.qty){const risk=rd*t.qty;if(risk>budget*1.5)f.push(['widestop',`Stop too wide / size too big: risked $${risk.toFixed(0)} vs $${budget.toFixed(0)} budget`])}
 if(t.pnl<0&&-R>1.3)f.push(['holdloser',`Held loser past stop: lost ${(-R).toFixed(1)}R`]);
 if(t.pnl>0&&R<0.5&&R>0)f.push(['earlyexit',`Early exit: only ${R.toFixed(2)}R captured`]);
 if(cs&&cs.length>12){const before=cs.filter(c=>c.t<=t.t).slice(-20);if(before.length>=8){const hi=Math.max(...before.map(c=>c.h)),lo=Math.min(...before.map(c=>c.l)),rng=hi-lo||1,e=isNaN(t.entry)?before[before.length-1].c:t.entry;
  const atr=before.reduce((a,c)=>a+c.h-c.l,0)/before.length,sma=before.reduce((a,c)=>a+c.c,0)/before.length,slope=before[before.length-1].c-before[0].c;
  if(long?(e-lo)/rng>.85:(hi-e)/rng>.85)f.push(['chase','Late / chased entry: entered at the extreme of the last 20 candles']);
  if(long?(slope<0&&e<sma):(slope>0&&e>sma))f.push(['trend','Against the short-term trend']);
  if(rd&&rd<atr*0.6)f.push(['tightstop',`Stop too tight: ${rd.toPrecision(3)} < 0.6×ATR (${atr.toPrecision(3)})`]);
  const after=cs.filter(c=>c.t>t.t);if(t.pnl>0&&after.length&&rd){const best=long?Math.max(...after.map(c=>c.h))-e:e-Math.min(...after.map(c=>c.l));if(best>3*rd&&R<1.5)f.push(['earlyexit',`Left money on the table: price ran ${(best/rd).toFixed(1)}R`])}}}
 return f}
const FOCUS={revenge:'After any loss, step away 20 minutes before the next trade.',overtrading:`Hard cap: stop at ${S.max} trades, then journal.`,news:'Flat 15 min before and after red-folder news.',offplan:'Only trade inside the planned blocks on the Plan tab.',widestop:'Use the position-size calculator on every trade – never exceed 1R.',holdloser:'Stop is placed in the platform at entry and never moved further away.',earlyexit:'Take half at 1R, trail the rest – let winners reach 2R.',chase:'No entries after an extended candle: wait for a pullback to the level.',trend:'Trade only in the direction of the 5-min 20-SMA slope.',tightstop:'Put stops beyond structure, at least 1×ATR away; reduce size instead.'};
async function renderCoach(){const el=document.getElementById('coach');if(!el)return;const cnt={};trades.forEach(t=>analyse(t,candleCache[t.id]).forEach(([k])=>cnt[k]=(cnt[k]||0)+1));
 const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
 el.innerHTML=trades.length?`<div><b>Recurring mistakes:</b> ${top.length?top.map(([k,n])=>`<span class="tag">${k} ×${n}</span>`).join(' '):'none detected yet 👍'}</div><div class="big">🎯 Next-session focus: ${top.length?FOCUS[top[0][0]]:'Keep following the plan; add entry/stop/exit to trades for deeper analysis.'}</div><p class="muted">Tap “Analyse” on a trade for candles + notes. Crypto candles: Binance; stocks/forex candles via Yahoo when the browser allows it, otherwise entry/stop/exit levels only.</p><div id="tradeA"></div>`:'<p class="muted">Add or import trades to get coaching.</p>'}
async function showTrade(id){const t=trades.find(x=>String(x.id)===id);if(!t)return;const box=document.getElementById('tradeA');box.innerHTML='<p class="muted">Loading candles…</p>';box.scrollIntoView({behavior:'smooth'});
 const cs=await candles(t),f=analyse(t,cs);renderCoach().then(()=>{const b=document.getElementById('tradeA');
 b.innerHTML=`<h3>${esc(t.sym)} ${esc(t.side||'')} <span class="${t.pnl>=0?'pos':'neg'}">${money(t.pnl)}</span></h3><canvas id="mini" height="200"></canvas><ul>${f.map(x=>`<li>${esc(x[1])}</li>`).join('')||'<li>Clean trade – no rule broken.</li>'}</ul>${cs?'':'<p class="muted">No candle data for this symbol/time (source blocked or too old) – showing levels only.</p>'}`;mini(t,cs)})}
function mini(t,cs){const c=document.getElementById('mini'),x=c.getContext('2d'),W=c.clientWidth,H=200;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);
 const lv=[t.entry,t.stop,t.exit].filter(v=>!isNaN(v)&&v!=null);let ps=lv.slice();if(cs)cs.forEach(k=>ps.push(k.h,k.l));if(!ps.length){x.fillStyle='#8a93a6';x.fillText('Add entry/stop/exit to see levels',10,20);return}
 const mn=Math.min(...ps),mx=Math.max(...ps),sp=mx-mn||1,Y=v=>H-10-(v-mn)/sp*(H-20);
 if(cs){const w=(W-60)/cs.length;cs.forEach((k,i)=>{const X=5+i*w+w/2;x.strokeStyle=x.fillStyle=k.c>=k.o?'#26c281':'#ef4f5f';x.beginPath();x.moveTo(X,Y(k.h));x.lineTo(X,Y(k.l));x.stroke();x.fillRect(X-w*.35,Math.min(Y(k.o),Y(k.c)),w*.7,Math.max(1,Math.abs(Y(k.o)-Y(k.c))))});
  const i=cs.findIndex(k=>k.t>=t.t);if(i>=0){x.strokeStyle='#d4af37';x.setLineDash([3,3]);x.beginPath();const X=5+i*w;x.moveTo(X,0);x.lineTo(X,H);x.stroke();x.setLineDash([])}}
 [['entry',t.entry,'#d4af37'],['stop',t.stop,'#ef4f5f'],['exit',t.exit,'#4f8cff']].forEach(([n,v,col])=>{if(isNaN(v)||v==null)return;x.strokeStyle=x.fillStyle=col;x.beginPath();x.moveTo(0,Y(v));x.lineTo(W-55,Y(v));x.stroke();x.font='11px sans-serif';x.fillText(n+' '+v,W-54,Y(v)+4)})}
document.getElementById('trades').addEventListener('click',e=>{const id=e.target.dataset.a;if(id!=null)showTrade(id)});
renderCoach();
