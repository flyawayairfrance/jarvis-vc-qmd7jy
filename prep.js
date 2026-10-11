'use strict';
(()=>{const $=s=>document.querySelector(s);let tf='60',sym=LS.g('prepSym','OANDA:XAUUSD'),cur=null;
const TFS=[['D','D'],['4H','240'],['1H','60'],['15m','15'],['5m','5'],['1m','1']];
const SYMS=['OANDA:XAUUSD','FX:EURUSD','FX:GBPUSD','FX:USDJPY','FOREXCOM:NSXUSD','FOREXCOM:SPXUSD','CME_MINI:NQ1!','CME_MINI:ES1!','TVC:USOIL','NASDAQ:AAPL','NASDAQ:NVDA','NASDAQ:TSLA','BITSTAMP:BTCUSD'];
function kz(d){return{tokyo:[zoneToBk(d,'Asia/Tokyo',9,0),zoneToBk(d,'Asia/Tokyo',12,0)],london:[zoneToBk(d,'Europe/London',7,0),zoneToBk(d,'Europe/London',10,0)],cash:[zoneToBk(d,'America/New_York',7,0),zoneToBk(d,'America/New_York',10,0)]}}
const sesKey=b=>b.key||(/tokyo|asia/i.test(b.title)?'tokyo':/london/i.test(b.title)?'london':/ny|new york|us /i.test(b.title)?'cash':(b.s<720?'tokyo':b.s<1140?'london':'cash'));
function tips(b,d){const k=sesKey(b),z=kz(d)[k],r=`${fmtM(z[0])}–${fmtM(z[1])}`;return{
 tokyo:`🇯🇵 Tokyo · killzone ${r} BKK. Usually ranges: fade the extremes of the overnight NY range, JPY pairs/gold/Nikkei move most. Mark the Asia high/low – London will raid one of them. Lower size, smaller targets.`,
 london:`🇬🇧 London · killzone ${r} BKK. Classic Judas swing: first move often sweeps the Asia high or low, then reverses. Wait for the sweep + MSS before entering. EUR, GBP, gold, DAX.`,
 cash:`🇺🇸 New York · killzone ${r} BKK (US cash open ${fmtM(zoneToBk(d,'America/New_York',9,30))}). 08:30 ET data (${fmtM(zoneToBk(d,'America/New_York',8,30))} BKK) and the cash open cause spikes – avoid entering 5 min around them. Look for a sweep of the London high/low, then trade the continuation or reversal. Stocks, NQ/ES, gold.`}[k]}
function steps(b,d){const ev=dayEvents(d).filter(e=>e.m>=b.s-60&&e.m<=b.e+30),k=sesKey(b),r=S.acct*S.risk/100;
 const rng=k=='london'?'Asia range (Tokyo session high/low)':k=='cash'?'London range (London session high/low)':'prior NY session high/low';
 return[
 {t:'News check',tf:'Calendar',look:ev.length?'⚠ High-impact in/near session: '+ev.map(e=>fmtM(e.m)+' '+(e.country||'')+' '+e.title).join(', ')+'. Stay flat 15 min before and after.':'No high-impact news in/near this session (check the News tab for surprises).'},
 {t:'HTF bias',tf:'Daily + 4H',look:'Trend: HH/HL = bullish, LH/LL = bearish, overlapping = range. Price above or below the 200 EMA? Set your bias below.',bias:1},
 {t:'Key levels',tf:'1H',look:`Mark prior day high/low, ${rng}, equal highs/lows (liquidity pools), round numbers (.00/.50, 100s on indices).`},
 {t:'FVG + order blocks',tf:'15m',look:'Fair value gaps and order blocks in the direction of your bias. Buy only in discount (below 50% of the range), sell only in premium.'},
 {t:'Entry trigger',tf:'5m / 1m',look:'Wait for: liquidity sweep of a marked level → market structure shift → retest of the FVG created by the shift. No sweep, no trade.'},
 {t:'Trade plan',tf:'—',look:`Entry zone, stop beyond the sweep, target the next liquidity. R:R must be ≥ 2. Risk ${S.risk}% = ${money(r)}.`,plan:1},
 {t:'Mindset',tf:'—',look:`Rested and calm? Accept the ${money(r)} loss in advance. Max ${b.goal?.trades??S.max} trades, stop at ${money(S.acct*S.stop/100)} daily loss. No revenge trades.`}]}
const st=d=>LS.g('prep_'+d,{}),put=(d,o)=>LS.s('prep_'+d,o);
function blocksToday(){return(plans[day]||plan()).slice().sort((a,c)=>a.s-c.s)}
function render(){const bl=blocksToday(),sel=$('#prepBlk');if(!bl.length){sel.innerHTML='';$('#prepTips').textContent='No sessions planned for '+day+'. Add one on the Plan tab or ask the Assistant.';$('#prepSteps').innerHTML='';$('#prepStatus').textContent='—';return}
 if(!cur||!bl.find(b=>b.id==cur)){const now=bkMin(new Date());cur=(bl.find(b=>b.e>now&&day==bkDate(new Date()))||bl[0]).id}
 sel.innerHTML=bl.map(b=>`<option value="${b.id}" ${b.id==cur?'selected':''}>${day} · ${fmtM(b.s)} ${esc(b.title.split(' –')[0])} (prep ${fmtM(b.s-40)})</option>`).join('');
 const b=bl.find(x=>x.id==cur),o=st(day)[cur]||{s:{},bias:'',plan:{}},ss=steps(b,day);$('#prepTips').textContent=tips(b,day)+`  ⏰ Start prep at ${fmtM(b.s-40)} BKK.`;
 const p=o.plan||{},risk=Math.abs(p.entry-p.stop),rr=risk?Math.abs(p.target-p.entry)/risk:NaN,size=risk?(S.acct*S.risk/100)/risk:NaN;
 $('#prepSteps').innerHTML=ss.map((x,i)=>`<div class="bk"><label style="color:var(--tx);margin:0"><input type="checkbox" data-c="${i}" ${o.s[i]?.c?'checked':''} style="display:inline;width:auto"> <b>${i+1}. ${x.t}</b> <span class="tag" style="background:#1d2a44;color:#9cc0ff">${x.tf}</span></label><div class="muted" style="margin:4px 0">${esc(x.look)}</div>
 ${x.bias?`<div class="row">${['Bull','Bear','Range'].map(v=>`<button data-bias="${v}" class="${o.bias==v?'pri':''}">${v}</button>`).join('')}</div>`:''}
 ${x.plan?`<div class="row wrap"><input data-p="entry" type="number" step="any" placeholder="Entry" value="${p.entry??''}"><input data-p="stop" type="number" step="any" placeholder="Stop" value="${p.stop??''}"><input data-p="target" type="number" step="any" placeholder="Target" value="${p.target??''}"></div><div class="${rr>=2?'pos':'neg'}">${isNaN(rr)?'Enter levels to compute R:R and size.':`R:R ${rr.toFixed(2)} ${rr>=2?'✓':'✗ (needs ≥ 2)'} · size ${size.toFixed(3)} units (per 1.0 point) · risk ${S.risk}% = ${money(S.acct*S.risk/100)} · reward ${money(S.acct*S.risk/100*rr)}`}</div>`:''}
 <input data-n="${i}" placeholder="Notes" value="${esc(o.s[i]?.n||'')}" style="width:100%;margin-top:6px"></div>`).join('');
 const all=ss.every((_,i)=>o.s[i]?.c)&&o.bias&&(isNaN(rr)||rr>=2);const sb=$('#prepStatus');sb.textContent=all?'✅ READY':`Not ready (${ss.filter((_,i)=>o.s[i]?.c).length}/${ss.length})`;sb.className='badge'+(all?'':' bad')}
function upd(f){const all=st(day),o=all[cur]||{s:{},bias:'',plan:{}};f(o);all[cur]=o;put(day,all);render()}
$('#prepSteps').addEventListener('change',e=>{const g=e.target.dataset;if(g.c!=null)upd(o=>{o.s[g.c]={...(o.s[g.c]||{}),c:e.target.checked}});else if(g.n!=null)upd(o=>{o.s[g.n]={...(o.s[g.n]||{}),n:e.target.value}});else if(g.p)upd(o=>{o.plan=o.plan||{};o.plan[g.p]=num(e.target.value)})});
$('#prepSteps').addEventListener('click',e=>{const v=e.target.dataset.bias;if(v)upd(o=>o.bias=v)});
$('#prepBlk').onchange=e=>{cur=+e.target.value;render()};
function chart(){const c=$('#prepChart');c.innerHTML='<div class="tradingview-widget-container" style="height:100%"><div class="tradingview-widget-container__widget" style="height:100%"></div></div>';const s=document.createElement('script');s.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';s.async=true;s.innerHTML=JSON.stringify({autosize:true,symbol:sym,interval:tf,timezone:TZ,theme:'dark',style:'1',locale:'en',allow_symbol_change:true,studies:['STD;EMA'],isTransparent:true});c.firstChild.appendChild(s);
 $('#tfBtns').innerHTML=TFS.map(([n,v])=>`<button data-tf="${v}" class="${v==tf?'pri':''}">${n}</button>`).join('')}
$('#tfBtns').onclick=e=>{if(e.target.dataset.tf){tf=e.target.dataset.tf;chart()}};
$('#symList').innerHTML=SYMS.map(s=>`<option value="${s}">`).join('');$('#prepSym').value=sym;
$('#prepGo').onclick=()=>{sym=$('#prepSym').value.trim().toUpperCase()||sym;LS.s('prepSym',sym);chart()};
let loaded=false;document.querySelector('[data-t=prep]').addEventListener('click',()=>{render();if(!loaded){loaded=true;chart()}});
window.prepSummary=d=>{const bl=(plans[d]||(d==day?plan():propose(d))).slice().sort((a,c)=>a.s-c.s);if(!bl.length)return'No sessions planned for '+d+' – nothing to prep.';const now=bkMin(new Date()),b=(d==bkDate(new Date())&&bl.find(x=>x.e>now))||bl[0],o=st(d)[b.id]||{s:{}},ss=steps(b,d);
 return `🧭 Prep for ${fmtM(b.s)} ${b.title.split(' –')[0]} (${d}) – start at ${fmtM(b.s-40)} BKK\n${tips(b,d)}\n`+ss.map((x,i)=>`${o.s[i]?.c?'☑':'☐'} ${i+1}. ${x.t} [${x.tf}] – ${x.look}`).join('\n')+(o.bias?`\nBias: ${o.bias}`:'')};
setInterval(()=>{const d=bkDate(new Date()),now=bkMin(new Date()),f=LS.g('prepFired',{});(plans[d]||[]).forEach(b=>{const k=d+b.id;if(now>=b.s-40&&now<b.s&&!f[k]){f[k]=1;LS.s('prepFired',f);const m=`⏰ Prep time: ${b.title.split(' –')[0]} starts at ${fmtM(b.s)}. Open the Prep tab.`;showBanner(m,'warn');if(window.Notification&&Notification.permission=='granted')new Notification('Trading Assistant',{body:m})}})},30000);
})();
