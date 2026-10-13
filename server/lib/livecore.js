/* generated from /live-core.js – do not edit */const module={exports:{}};
/* JARVIS LiveCore: deterministic market-structure detectors (pure functions, unit-tested in test/live-core.test.js).
   Candle format: {t (unix s), o, h, l, c, v}. All outputs are derived only from the candles passed in. */
(function(root){
const ema=(c,p)=>{const k=2/(p+1),o=[];let e=c[0]?.c;c.forEach((x,i)=>{e=i?x.c*k+e*(1-k):x.c;o.push(e)});return o};
function atr(c,n=14){const o=[];let a=null;for(let i=0;i<c.length;i++){const tr=i?Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)):c[i].h-c[i].l;
 if(i<n){a=((a??0)*i+tr)/(i+1)}else a=(a*(n-1)+tr)/n;o.push(a)}return o}
/* pivot swings: bar i is a swing high if its high is strictly above the k bars before it and not exceeded by the k bars after it (confirmed only after k bars) */
function swings(c,k=3){const s=[];for(let i=k;i<c.length-k;i++){let H=true,L=true;for(let j=i-k;j<=i+k;j++){if(j==i)continue;if(j<i?c[j].h>=c[i].h:c[j].h>c[i].h)H=false;if(j<i?c[j].l<=c[i].l:c[j].l<c[i].l)L=false}
 if(H)s.push({type:'H',i,p:c[i].h,t:c[i].t});if(L)s.push({type:'L',i,p:c[i].l,t:c[i].t})}return s}
/* structure: walk closes; a close beyond the latest confirmed swing = BOS (with trend) or CHoCH (against trend) */
function structure(c,k=3){const sw=swings(c,k),ev=[];let trend='range',hi=null,lo=null,si=0;
 for(let i=0;i<c.length;i++){while(si<sw.length&&sw[si].i+k<=i){const s=sw[si++];if(s.type=='H')hi={...s,used:false};else lo={...s,used:false}}
  if(hi&&!hi.used&&c[i].c>hi.p){ev.push({type:trend=='down'?'CHoCH':'BOS',dir:'up',level:hi.p,i,from:hi.i,t:c[i].t});trend='up';hi.used=true}
  if(lo&&!lo.used&&c[i].c<lo.p){ev.push({type:trend=='up'?'CHoCH':'BOS',dir:'down',level:lo.p,i,from:lo.i,t:c[i].t});trend='down';lo.used=true}}
 return{trend,events:ev,swings:sw,lastHigh:hi,lastLow:lo}}
/* FVG: exact 3-candle rule. Bullish: low[i] > high[i-2]; gap = [high[i-2], low[i]]. Bearish: high[i] < low[i-2]; gap = [high[i], low[i-2]].
   Status from later bars: open (untouched), partial (traded into), filled (fully traded through). */
function fvgs(c,minSize=0){const o=[];for(let i=2;i<c.length;i++){const a=c[i-2],b=c[i];let g=null;
 if(b.l>a.h&&b.l-a.h>minSize)g={dir:'bull',bottom:a.h,top:b.l,i:i-1,t:c[i-1].t};else if(b.h<a.l&&a.l-b.h>minSize)g={dir:'bear',bottom:b.h,top:a.l,i:i-1,t:c[i-1].t};if(!g)continue;
 g.status='open';g.touched=null;for(let j=i+1;j<c.length;j++){const x=c[j];if(g.dir=='bull'){if(x.l<=g.bottom){g.status='filled';g.touched??=j;break}if(x.l<g.top){g.status='partial';g.touched??=j}}
  else{if(x.h>=g.top){g.status='filled';g.touched??=j;break}if(x.h>g.bottom){g.status='partial';g.touched??=j}}}o.push(g)}return o}
/* Order block: for each BOS/CHoCH, the last opposite-colour candle between the origin swing and the break. Invalid once a later close goes through it. */
function orderBlocks(c,st){const o=[];for(const e of st.events){let ob=null;for(let j=e.i-1;j>=Math.max(0,e.from-3);j--){const x=c[j];if(e.dir=='up'?x.c<x.o:x.c>x.o){ob=j;break}}if(ob==null)continue;
 const z={dir:e.dir=='up'?'bull':'bear',top:c[ob].h,bottom:c[ob].l,i:ob,t:c[ob].t,from:e.type,status:'fresh'};
 for(let j=e.i+1;j<c.length;j++){const x=c[j];if(z.dir=='bull'?x.c<z.bottom:x.c>z.top){z.status='invalid';break}if(z.dir=='bull'?x.l<=z.top:x.h>=z.bottom)z.status='mitigated'}
 if(!o.some(q=>q.i==z.i))o.push(z)}return o}
const day=t=>Math.floor(t/86400);
/* session windows in UTC minutes */
const SESS=[['Asia',0,420],['London',420,720],['New York',750,1200]];
function liquidity(c,A,k=3){const sw=swings(c,k),tol=A*0.1,pools=[],last=c.length-1;
 const unswept=(p,side,from)=>!c.slice(from+1).some(x=>side=='buy'?x.h>p:x.l<p);
 const H=sw.filter(s=>s.type=='H'),L=sw.filter(s=>s.type=='L');
 for(let a=0;a<H.length;a++)for(let b=a+1;b<H.length;b++)if(Math.abs(H[a].p-H[b].p)<=tol){const p=Math.max(H[a].p,H[b].p);pools.push({kind:'EQH',side:'buy',p,i:H[b].i,swept:!unswept(p,'buy',H[b].i)})}
 for(let a=0;a<L.length;a++)for(let b=a+1;b<L.length;b++)if(Math.abs(L[a].p-L[b].p)<=tol){const p=Math.min(L[a].p,L[b].p);pools.push({kind:'EQL',side:'sell',p,i:L[b].i,swept:!unswept(p,'sell',L[b].i)})}
 const today=day(c[last].t),prev=c.filter(x=>day(x.t)==today-1);if(prev.length){const i0=c.indexOf(prev[prev.length-1]);const ph=Math.max(...prev.map(x=>x.h)),pl=Math.min(...prev.map(x=>x.l));pools.push({kind:'PDH',side:'buy',p:ph,i:i0,swept:!unswept(ph,'buy',i0)},{kind:'PDL',side:'sell',p:pl,i:i0,swept:!unswept(pl,'sell',i0)})}
 const ranges=sessions(c);ranges.filter(r=>r.done).slice(-3).forEach(r=>pools.push({kind:r.name+' H',side:'buy',p:r.high,i:r.end,swept:!unswept(r.high,'buy',r.end)},{kind:r.name+' L',side:'sell',p:r.low,i:r.end,swept:!unswept(r.low,'sell',r.end)}));
 return pools}
function sessions(c){const o=[],last=c[c.length-1];for(let i=0;i<c.length;i++){const m=Math.floor(c[i].t%86400/60),d=day(c[i].t),s=SESS.find(x=>m>=x[1]&&m<x[2]);if(!s)continue;let r=o.find(x=>x.d==d&&x.name==s[0]);
 if(!r)o.push(r={name:s[0],d,high:-Infinity,low:Infinity,start:i,end:i});r.high=Math.max(r.high,c[i].h);r.low=Math.min(r.low,c[i].l);r.end=i}
 o.forEach(r=>{const s=SESS.find(x=>x[0]==r.name);r.done=day(last.t)>r.d||Math.floor(last.t%86400/60)>=s[2]});return o}
/* sweep on bar i: wick through the pool and close back on the other side */
function sweeps(c,pools,i=c.length-1){const x=c[i];return pools.filter(p=>p.i<i&&!c.slice(p.i+1,i).some(y=>p.side=='buy'?y.h>p.p:y.l<p.p)&&(p.side=='buy'?x.h>p.p&&x.c<p.p:x.l<p.p&&x.c>p.p)).map(p=>({...p,bar:i,extreme:p.side=='buy'?x.h:x.l}))}
/* VWAP anchored at 00:00 UTC of the last bar's day; falls back to equal weights if volume is missing */
function vwap(c){const d=day(c[c.length-1].t),s=c.filter(x=>day(x.t)==d);const vol=s.some(x=>x.v>0);let pv=0,vv=0;s.forEach(x=>{const w=vol?(x.v||0):1;pv+=(x.h+x.l+x.c)/3*w;vv+=w});return{vwap:vv?pv/vv:null,weighted:vol}}
function trendOf(c){if(c.length<55)return'range';const e20=ema(c,20),e50=ema(c,50),n=c.length-1,st=structure(c).trend,p=c[n].c;
 const et=p>e20[n]&&e20[n]>e50[n]?'up':p<e20[n]&&e20[n]<e50[n]?'down':'range';return et==st?et:et=='range'?st:st=='range'?et:'range'}
/* contract specs: $ per 1.0 price move per contract/lot */
const SPEC={NQ:{per:20,unit:'NQ',micro:{per:2,unit:'MNQ'}},ES:{per:50,unit:'ES',micro:{per:5,unit:'MES'}},GOLD:{per:100,unit:'GC',micro:{per:10,unit:'MGC'}},
 XAU:{per:100,unit:'lot (100 oz)',frac:0.01},DAX:{per:25,unit:'FDAX',micro:{per:1,unit:'FDXS'}},
 EURUSD:{fx:true},GBPUSD:{fx:true},AUDUSD:{fx:true},USDJPY:{fx:true,quoteUSD:false}};
function size(sym,entry,stop,riskUSD){const d=Math.abs(entry-stop);if(!(d>0))return null;const s=SPEC[sym];
 if(s?.fx){const pip=/JPY/.test(sym)?0.01:0.0001,pips=d/pip,pv=sym.startsWith('USD')?1e5*pip/entry:10;const lots=Math.floor(riskUSD/(pips*pv)*100+1e-6)/100;return{qty:lots,unit:'lots',pips:+pips.toFixed(1),pipValue:+pv.toFixed(2),risk:+(lots*pips*pv).toFixed(2)}}
 if(s){let q=riskUSD/(d*s.per);if(s.frac){q=Math.floor(q/s.frac+1e-6)*s.frac;return{qty:+q.toFixed(2),unit:s.unit,risk:+(q*d*s.per).toFixed(2)}}
  q=Math.floor(q+1e-9);if(q>=1)return{qty:q,unit:s.unit,points:+d.toFixed(2),risk:+(q*d*s.per).toFixed(2)};const m=Math.floor(riskUSD/(d*s.micro.per));return{qty:m,unit:s.micro.unit,points:+d.toFixed(2),risk:+(m*d*s.micro.per).toFixed(2),note:m?null:'stop too wide for account risk'}}
 const q=riskUSD/d;return{qty:q>=10?Math.floor(q):+q.toPrecision(3),unit:'units',risk:+((q>=10?Math.floor(q):q)*d).toFixed(2)}}
/* full read + strict setup rules */
function analyse(c,mtf={}){const n=c.length-1;if(n<60)return null;const A=atr(c)[n],st=structure(c),fv=fvgs(c,A*0.05),ob=orderBlocks(c,st),pools=liquidity(c,A),vw=vwap(c),p=c[n].c,e=ema(c,20)[n],e50=ema(c,50)[n];
 return{price:p,atr:A,trend:st.trend,ema20:e,ema50:e50,structure:st.events.slice(-4),lastHigh:st.lastHigh?.p,lastLow:st.lastLow?.p,
  fvgs:fv.filter(g=>g.status!='filled').slice(-6),obs:ob.filter(z=>z.status!='invalid').slice(-4),pools:pools.filter(x=>!x.swept),vwap:vw.vwap,vwapWeighted:vw.weighted,sessions:sessions(c).slice(-3),mtf,
  sweep:sweeps(c,pools,n-1)}}
function setup(c,a,sym,riskUSD){if(!a)return null;const n=c.length-1,k=c[n-1],A=a.atr,tfs=Object.values(a.mtf||{}),up=tfs.filter(x=>x=='up').length,dn=tfs.filter(x=>x=='down').length;
 const htf=[a.mtf?.['15m'],a.mtf?.['1h']];const out=[];
 for(const dir of['BUY','SELL']){const L=dir=='BUY',agree=L?up:dn,against=L?dn:up;if(tfs.length<4||agree<3||against>0||htf.some(x=>x==(L?'down':'up')))continue;
  let trig=null,lvl=null;const sw=a.sweep.find(s=>s.side==(L?'sell':'buy'));
  if(sw){trig=`sweep of ${sw.kind} ${fx(sw.p)} (wick ${fx(sw.extreme)}) closed back ${L?'above':'below'}`;lvl=sw.extreme}
  else{const z=[...a.fvgs.filter(g=>g.dir==(L?'bull':'bear')).map(g=>({...g,name:'FVG'})),...a.obs.filter(o=>o.dir==(L?'bull':'bear')).map(o=>({...o,name:'order block'}))].find(z=>z.i<n-2&&(L?k.l<=z.top&&k.l>=z.bottom&&k.c>z.top:k.h>=z.bottom&&k.h<=z.top&&k.c<z.bottom));
   const brk=a.structure.filter(s=>s.dir==(L?'up':'down')).pop();if(z&&brk&&brk.i>=z.i-1){trig=`retest of ${L?'bullish':'bearish'} ${z.name} ${fx(z.bottom)}–${fx(z.top)} after ${brk.type} ${fx(brk.level)}, rejection close`;lvl=L?z.bottom:z.top}}
  if(!trig)continue;const entry=c[n].c,stop=L?lvl-0.25*A:lvl+0.25*A,d=Math.abs(entry-stop);if(d<0.5*A||d>3*A)continue;if(L?entry<=stop:entry>=stop)continue;
  const tg=a.pools.filter(p=>p.side==(L?'buy':'sell')&&(L?p.p>entry:p.p<entry)).sort((x,y)=>L?x.p-y.p:y.p-x.p);const t=tg.find(p=>Math.abs(p.p-entry)/d>=2);if(!t)continue;
  const rr=Math.abs(t.p-entry)/d,vwOk=a.vwap==null||(L?entry>a.vwap:entry<a.vwap);const conf=Math.min(90,45+agree*8+(vwOk?10:0)+(sw?5:0));
  out.push({dir,entry,stop,target:t.p,targetName:t.kind,rr,conf,reason:`${trig}; MTF ${agree}/4 ${L?'up':'down'}; ${vwOk?'':'against '}VWAP ${fx(a.vwap)}; stop ${fx(0.25)}×ATR beyond structure; target ${t.kind} ${fx(t.p)}.`,size:size(sym,entry,stop,riskUSD)})}
 return out[0]||null}

/* ---------- confluence engine (A+ signals) ---------- */
function rsi(c,n=14){const o=[];let g=0,l=0;for(let i=0;i<c.length;i++){if(!i){o.push(50);continue}const d=c[i].c-c[i-1].c,G=Math.max(d,0),Lo=Math.max(-d,0);if(i<=n){g+=G/n;l+=Lo/n}else{g=(g*(n-1)+G)/n;l=(l*(n-1)+Lo)/n}o.push(l==0?100:100-100/(1+g/l))}return o}
/* aggregate lower-tf candles into tf seconds (completed buckets only up to time t) */
function agg(c,sec){const o=[];for(const k of c){const b=Math.floor(k.t/sec)*sec,l=o[o.length-1];if(l&&l.t==b){l.h=Math.max(l.h,k.h);l.l=Math.min(l.l,k.l);l.c=k.c;l.v+=k.v||0}else o.push({t:b,o:k.o,h:k.h,l:k.l,c:k.c,v:k.v||0})}return o}
const KZ=t=>{const m=Math.floor(t%86400/60);return(m>=420&&m<600)?'London killzone':(m>=750&&m<930)?'NY killzone':null};
/* default weights (sum 100); gates: R:R>=2.5 to opposing liquidity, no high-impact news <=15 min, daily stop not hit */
const W0={htf:15,mtf:10,sweep:20,zone:10,pd:8,vwap:5,kz:7,vol:5,div:8,rr:12};
const LABEL={htf:'HTF bias (4H/1H structure + EMA50/200)',mtf:'15m/5m/1m agreement',sweep:'Liquidity sweep → CHoCH/BOS with displacement ≥1.5×ATR',zone:'Entry at unmitigated FVG / order block',pd:'Premium/discount of dealing range',vwap:'Correct side of VWAP',kz:'Session timing (London/NY killzone)',vol:'Volume/tick spike on sweep or displacement',div:'RSI divergence at the sweep',rr:'Opposing liquidity ≥ 2.5R away'};
/* c: chart candles (closed bars only; last element = last closed bar). ctx: {h1,h4,m15,m1 (candles, optional), newsSoon, stopHit, W, sym, riskUSD} */
function confluence(c,ctx={}){const n=c.length-1;if(n<120)return null;const W={...W0,...(ctx.W||{})},A=atr(c)[n],k=c[n],st=structure(c),R=rsi(c),e50=ema(c,50),e200=ema(c,200);
 const tr=x=>x&&x.length>=55?trendOf(x):null,h1=ctx.h1,h4=ctx.h4,t1=tr(h1),t4=tr(h4),t15=tr(ctx.m15),t5=st.trend,t1m=tr(ctx.m1);
 const h1e=h1&&h1.length>=60?{p:h1[h1.length-1].c,e50:ema(h1,50)[h1.length-1],e200:ema(h1,Math.min(200,h1.length-1))[h1.length-1]}:null;
 const pools=liquidity(c,A),vw=vwap(c).vwap,lo100=Math.min(...c.slice(n-100).map(x=>x.l)),hi100=Math.max(...c.slice(n-100).map(x=>x.h)),mid=(lo100+hi100)/2;
 const v20=c.slice(n-20,n).reduce((a,x)=>a+(x.v||0),0)/20;const best=[];
 for(const dir of['BUY','SELL']){const L=dir=='BUY',D=L?'up':'down',m={};let type=null,stop=null,why=[];
  // trigger 1: sweep -> shift (structure event on the last 3 bars, displacement body >= 1.5 ATR)
  const ev=st.events.filter(e=>e.dir==D&&e.i>=n-2).pop();let sweepBar=null;
  if(ev){const disp=c.slice(Math.max(0,ev.i-3),ev.i+1).find(x=>(L?x.c-x.o:x.o-x.c)>=1.5*A);
   for(let j=ev.i-1;j>=Math.max(1,ev.i-15)&&!sweepBar;j--){const x=c[j],pre=c.slice(Math.max(0,j-40),j);if(pre.length<20)continue;const ext=L?Math.min(...pre.map(y=>y.l)):Math.max(...pre.map(y=>y.h));
    const pl=pools.find(p=>p.side==(L?'sell':'buy')&&p.i<j&&(L?x.l<p.p&&x.c>p.p:x.h>p.p&&x.c<p.p));if(pl||(L?x.l<ext&&x.c>ext:x.h>ext&&x.c<ext))sweepBar={j,ext:L?x.l:x.h,name:pl?pl.kind:'40-bar '+(L?'low':'high'),lvl:pl?pl.p:ext}}
   if(sweepBar&&disp){m.sweep=1;type='sweep→'+ev.type;stop=L?sweepBar.ext-0.25*A:sweepBar.ext+0.25*A;why.push(`swept ${sweepBar.name} ${fx(sweepBar.lvl)}, ${ev.type} ${fx(ev.level)} with displacement`)}}
  // trigger 2: retest of unmitigated FVG/OB in trend, rejection close
  const fz=fvgs(c,A*0.05).filter(g=>g.dir==(L?'bull':'bear')&&g.status!='filled'&&g.i<n-2&&g.i>n-60),oz=orderBlocks(c,st).filter(o=>o.dir==(L?'bull':'bear')&&o.status!='invalid'&&o.i>n-80);
  const zone=[...fz.map(z=>({...z,name:'FVG'})),...oz.map(z=>({...z,name:'OB'}))].find(z=>L?k.l<=z.top&&k.l>=z.bottom-0.1*A&&k.c>z.top:k.h>=z.bottom&&k.h<=z.top+0.1*A&&k.c<z.bottom);
  const fresh=fz.find(g=>sweepBar&&g.i>=sweepBar.j);
  if(zone||fresh){m.zone=1;if(!type&&zone&&t5==D){type=zone.name+' retest';stop=L?zone.bottom-0.25*A:zone.top+0.25*A;why.push(`rejection from ${zone.name} ${fx(zone.bottom)}–${fx(zone.top)}`)}else if(zone||fresh)why.push(zone?`${zone.name} ${fx(zone.bottom)}–${fx(zone.top)}`:`fresh FVG ${fx(fresh.bottom)}–${fx(fresh.top)}`)}
  if(!type)continue;const entry=k.c,d=Math.abs(entry-stop);if(!(d>=0.5*A&&d<=4*A)||(L?stop>=entry:stop<=entry))continue;
  // HTF / MTF
  let h=0;if(t4==D)h+=1/3;if(t1==D)h+=1/3;if(h1e&&(L?h1e.p>h1e.e200&&h1e.e50>h1e.e200:h1e.p<h1e.e200&&h1e.e50<h1e.e200))h+=1/3;m.htf=h;
  const mt=[t15,ev?D:t5,t1m].filter(x=>x!=null);m.mtf=mt.length?mt.filter(x=>x==D).length/mt.length:0;
  m.pd=(L?entry<mid:entry>mid)?1:0;m.vwap=vw==null?0:(L?entry>vw:entry<vw)?1:0;m.kz=KZ(k.t)?1:0;
  const vb=[sweepBar&&c[sweepBar.j],k,c[n-1]].filter(Boolean);m.vol=v20>0&&vb.some(x=>x.v>=1.5*v20)?1:0;
  if(sweepBar){const sw=swings(c.slice(0,sweepBar.j),3).filter(s=>s.type==(L?'L':'H')&&s.i<sweepBar.j-2).pop();if(sw&&(L?c[sweepBar.j].l<sw.p&&R[sweepBar.j]>R[sw.i]:c[sweepBar.j].h>sw.p&&R[sweepBar.j]<R[sw.i]))m.div=1}
  // target: nearest opposing liquidity must be >= 2.5R (otherwise it is a barrier)
  const opp=pools.filter(p=>p.side==(L?'buy':'sell')&&(L?p.p>entry:p.p<entry)).sort((x,y)=>L?x.p-y.p:y.p-x.p);let tgt=opp[0]?{p:opp[0].p,name:opp[0].kind}:null;
  if(!tgt){const hs=swings(c,3).filter(s=>s.type==(L?'H':'L')&&(L?s.p>entry:s.p<entry));const s2=hs.sort((x,y)=>L?x.p-y.p:y.p-x.p)[0];if(s2)tgt={p:s2.p,name:'swing '+(L?'high':'low')}}
  if(!tgt)continue;const rr=Math.abs(tgt.p-entry)/d;m.rr=rr>=2.5?1:0;
  const gates={rr:rr>=2.5,news:!ctx.newsSoon,stop:!ctx.stopHit};
  let score=0;for(const key in W)score+=W[key]*(m[key]||0);score=Math.round(score);if(!gates.rr||!gates.news||!gates.stop)score=Math.min(score,79);
  const checks=Object.keys(W).map(key=>({key,label:LABEL[key],w:W[key],met:(m[key]||0)>=0.99,part:m[key]||0}));
  best.push({dir,type,score,grade:score>=80?'A+':score>=65?'B':'C',entry,stop,target:tgt.p,targetName:tgt.name,rr,atr:A,checks,gates,features:m,trends:{'4h':t4,'1h':t1,'15m':t15,'5m':t5,'1m':t1m},
   invalidation:`${L?'5m close below':'5m close above'} ${fx(stop)} (beyond the ${sweepBar?'sweep extreme':'zone'}) or no follow-through within 12 bars`,why:why.join('; '),
   size:ctx.sym?size(ctx.sym,entry,stop,ctx.riskUSD||100):null})}
 return best.sort((a,b)=>b.score-a.score)[0]||null}
/* simulate a trade on future bars: stop first if both touched in one bar (conservative); time-out after maxBars at close */
function simulate(c,i,s,maxBars=48){const L=s.dir=='BUY',risk=Math.abs(s.entry-s.stop);for(let j=i+1;j<Math.min(c.length,i+1+maxBars);j++){const x=c[j];const hitS=L?x.l<=s.stop:x.h>=s.stop,hitT=L?x.h>=s.target:x.l<=s.target;if(hitS)return{r:-1,bars:j-i,exit:'stop'};if(hitT)return{r:Math.abs(s.target-s.entry)/risk,bars:j-i,exit:'target'}}
 const j=Math.min(c.length-1,i+maxBars);return{r:(L?c[j].c-s.entry:s.entry-c[j].c)/risk,bars:j-i,exit:'time'}}
const fx=v=>v==null?'–':+(+v).toPrecision(6);
const api={rsi,agg,confluence,simulate,W0,LABEL,KZ,ema,atr,swings,structure,fvgs,orderBlocks,liquidity,sessions,sweeps,vwap,trendOf,size,analyse,setup,SPEC};
if(typeof module!='undefined')module.exports=api;else root.LiveCore=api})(this);
export default module.exports;
