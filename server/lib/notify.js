import webpush from 'web-push';
import * as M from './market.js';
import LC from './livecore.js';
/* Web Push: subscriptions/prefs per account in Blob (push/<uid>.json) + server-side triggers run by /api/tick (pinged every ~5 min). */
export const DEF={live:true,sweeps:true,news:true,stop:true,scanner:false,briefing:true};
let ready=false;function init(){if(ready)return;webpush.setVapidDetails('mailto:flyawayairfrance@gmail.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);ready=true}
export const publicKey=()=>process.env.VAPID_PUBLIC_KEY||'';
/* send to every subscription of a user; prune dead ones (404/410) */
export async function send(rec,msg){init();const out={sent:0,failed:0,pruned:0,results:[]};const keep=[];
 for(const s of rec.subs||[]){const host=(()=>{try{return new URL(s.endpoint).host}catch{return'?'}})();let code,err='';
  try{const r=await webpush.sendNotification({endpoint:s.endpoint,keys:s.keys},JSON.stringify(msg),{TTL:msg.ttl||3600,urgency:msg.urgency||'high',contentEncoding:'aes128gcm'});code=r.statusCode;out.sent++}
  catch(e){code=e.statusCode||0;err=String(e.body||e.message||'').slice(0,160);if(code==404||code==410)out.pruned++;else out.failed++}
  s.last={code,err,at:Date.now()};out.results.push({host,code,err});if(code!=404&&code!=410)keep.push(s)}
 rec.subs=keep;out.summary=out.results.map(r=>`${r.host} ${r.code}${r.err?' '+r.err:''}`).join(' · ')||'no devices';return out}
const bkDate=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'});
const SRC={XAU:'PAXG',BTCUSDT:'BTC',ETHUSDT:'ETH',SOLUSDT:'SOL'};
const cs=async(sym,tf,n)=>(await M.candles(SRC[sym]||sym,tf,n)).candles.map(k=>({t:Math.floor(k.t/1000),o:k.o,h:k.h,l:k.l,c:k.c,v:k.v||0}));
const f=v=>+(+v).toPrecision(6);
/* one pass over all users; returns a log */
export async function tick({users,getState,shared}){const log=[],now=Date.now();
 for(const u of users){const r=u.rec,p={...DEF,...(r.prefs||{})},sent=r.sent=r.sent||{},q=[];if(!(r.subs||[]).length)continue;
  const once=(k,msg)=>{if(sent[k])return;sent[k]=now;q.push(msg)};
  // news 15 / 5 min before (high impact)
  if(p.news)for(const e of shared.cal){const m=Math.round(e.in_hours*60);for(const b of[15,5])if(m<=b&&m>b-(b==15?10:5))once('n'+b+e.title+e.bangkok,{title:`📰 ${e.country} ${e.title} in ${m} min`,body:`High-impact at ${e.bangkok} BKK. ${b==5?'Be flat or tight – spreads widen.':'Plan around it; cut size.'}`,tab:'news',tag:'news'})}
  // daily briefing
  if(p.briefing&&shared.briefing&&+new Date().toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',hour12:false})>=7)once('b'+shared.bd,{title:'☀️ JARVIS pre-session briefing',body:shared.briefing.slice(0,180),tab:'news',tag:'brief'});
  // opportunity scanner (max 2 per run)
  if(p.scanner)shared.alerts.filter(a=>now-a.t<30*60e3).slice(0,2).forEach(a=>once('a'+a.id,{title:'🎯 Scanner: '+(a.symbol||''),body:a.text,tab:'market',tag:'scan'}));
  // daily stop from synced journal + settings
  if(p.stop){try{const st=await getState(u.uid),P=k=>{try{return JSON.parse(st?.keys?.[k]||'null')}catch{return null}};const S={acct:10000,stop:3,...(P('ta_settings')||{})},tr=(P('ta_trades')||[]).filter(t=>bkDate(t.t)==bkDate(now));const pnl=tr.reduce((a,t)=>a+(+t.pnl||0),0),lim=S.acct*S.stop/100;
   if(pnl<=-lim)once('stop'+bkDate(now),{title:'⛔ Daily loss stop hit',body:`P&L today ${pnl.toFixed(0)} $ ≤ −${lim.toFixed(0)} $. Stop trading for today.`,tab:'risk',tag:'risk'});else if(pnl<=-0.7*lim)once('stop70'+bkDate(now),{title:'⚠️ 70% of daily stop used',body:`P&L today ${pnl.toFixed(0)} $ of −${lim.toFixed(0)} $. Reduce size or stop.`,tab:'risk',tag:'risk'})}catch(e){log.push('stop '+e.message)}}
  // live-session watcher (only when the app is not open: client heartbeats < 2 min handle it in-app)
  const ss=r.session;if(ss?.on&&now-ss.at<12*36e5&&!(now-(ss.seen||0)<120e3&&ss.visible)&&(p.live||p.sweeps)){try{const key=ss.sym+ss.tf;const W=shared.w[key]||(shared.w[key]=await watch(ss.sym,ss.tf,shared.cal.some(e=>Math.abs(e.in_hours)<=0.25)));
    if(p.sweeps)W.sweeps.forEach(s=>once('sw'+key+s.p+W.bar,{title:`${ss.sym}: sweep of ${s.kind}`,body:`Swept ${f(s.p)} and closed back – watching for an A+ setup`,tab:'live',tag:'live'}));
    if(p.live&&W.signal){const s=W.signal,why=[s.features.sweep?'Sweep':null,s.features.zone?(/OB/.test(s.type)?'OB':'FVG'):null].filter(Boolean).join(' + ')||s.type;once('sig'+key+s.dir+f(s.stop),{title:`${ss.sym}: ${s.dir} NOW!`,body:`${why} at ${f(s.entry)}, stop ${f(s.stop)}, target ${f(s.target)}`,tab:'live',tag:'live',urgency:'high'})}}catch(e){log.push('live '+e.message)}}
  for(const k in sent)if(now-sent[k]>3*864e5)delete sent[k];
  if(q.length){for(const m of q.slice(0,4)){const o=await send(r,m);log.push(`${u.uid.slice(0,6)} ${m.title}: ${JSON.stringify(o)}`)}u.dirty=true}}
 return log}
async function watch(sym,tf,newsSoon){const [c,m1,m15,h1,h4]=await Promise.all([cs(sym,tf,400),cs(sym,'1m',300),cs(sym,'15m',300),cs(sym,'1h',300),cs(sym,'4h',200)]);
 const cl=x=>x.slice(0,-1),C=cl(c);const a=LC.analyse(c,{});const sig=LC.confluence(C.slice(-300),{m1:tf=='1m'?null:cl(m1),m15:tf=='15m'?null:cl(m15),h1:cl(h1),h4:cl(h4),newsSoon,sym,riskUSD:100});
 return{bar:c[c.length-2].t,sweeps:a?a.sweep:[],signal:sig&&sig.score>=80?sig:null}}
