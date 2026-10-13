const UA={'user-agent':'Mozilla/5.0 (JarvisBot)'};
const ALIAS={NQ:'NQ=F',NAS100:'NQ=F',NASDAQ:'NQ=F',US100:'NQ=F',ES:'ES=F',SPX:'ES=F',SP500:'ES=F',US500:'ES=F',YM:'YM=F',DOW:'YM=F',US30:'YM=F',RTY:'RTY=F',DAX:'^GDAXI',GER40:'^GDAXI',DE40:'^GDAXI',NIKKEI:'^N225',JP225:'^N225',FTSE:'^FTSE',UK100:'^FTSE',GOLD:'GC=F',GC:'GC=F',MGC:'GC=F',SI:'SI=F',CL:'CL=F',MNQ:'NQ=F',MES:'ES=F',XAUUSD:'GC=F',XAU:'GC=F',SILVER:'SI=F',XAGUSD:'SI=F',OIL:'CL=F',WTI:'CL=F',USOIL:'CL=F',DXY:'DX-Y.NYB',VIX:'^VIX'};
const CRYPTO=/^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|LINK|LTC)(USDT?|)$/;
export function resolve(sym){let s=String(sym||'').toUpperCase().replace(/^[A-Z]+:/,'').replace(/[\s/]/g,'').replace(/1!$/,'');
 if(ALIAS[s])return{src:'yahoo',id:ALIAS[s],name:s};const c=s.match(CRYPTO);if(c)return{src:'binance',id:c[1]+'USDT',name:c[1]+'USD'};
 if(/^[A-Z]{6}$/.test(s)&&/^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF)/.test(s))return{src:'yahoo',id:s+'=X',name:s};return{src:'yahoo',id:s,name:s}}
const YI={'1m':['1m','1d'],'5m':['5m','5d'],'15m':['15m','5d'],'30m':['30m','1mo'],'1h':['60m','1mo'],'4h':['60m','3mo'],'1d':['1d','1y']};
export async function candles(sym,tf='1h',n=200){const r=resolve(sym);tf=YI[tf]?tf:'1h';let c=[];
 if(r.src=='binance'){const j=await (await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${r.id}&interval=${tf}&limit=${Math.min(n,500)}`)).json();c=j.map(k=>({t:k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5]}))}
 else{const [iv,rg]=YI[tf];let x;for(const hst of['query1','query2']){try{const j=await (await fetch(`https://${hst}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(r.id)}?interval=${iv}&range=${rg}`,{headers:UA})).json();x=j?.chart?.result?.[0];if(x?.timestamp)break}catch{}}if(!x?.timestamp)throw new Error('No data for '+sym);const q=x.indicators.quote[0];
  c=x.timestamp.map((t,i)=>({t:t*1000,o:q.open[i],h:q.high[i],l:q.low[i],c:q.close[i],v:q.volume[i]})).filter(k=>k.c!=null&&k.h!=null);
  if(tf=='4h'){const g=[];for(const k of c){const b=Math.floor(k.t/144e5)*144e5,l=g[g.length-1];if(l&&l.t==b){l.h=Math.max(l.h,k.h);l.l=Math.min(l.l,k.l);l.c=k.c;l.v+=k.v||0}else g.push({...k,t:b})}c=g}}
 return{symbol:r.name,source:r.src,tf,candles:c.slice(-n)}}
const ema=(a,p)=>{const k=2/(p+1);let e=a[0];return a.map(v=>e=v*k+e*(1-k))};
const rnd=v=>v==null?v:+(+v).toPrecision(6);
export function analyse(c){const cl=c.map(k=>k.c),last=c[c.length-1],n=c.length;
 const e20=ema(cl,20),e50=ema(cl,50);const tr=c.slice(1).map((k,i)=>Math.max(k.h-k.l,Math.abs(k.h-c[i].c),Math.abs(k.l-c[i].c)));const atr=tr.slice(-14).reduce((a,b)=>a+b,0)/Math.min(14,tr.length);
 const slope=e50[n-1]-e50[Math.max(0,n-11)];const trend=last.c>e20[n-1]&&e20[n-1]>e50[n-1]&&slope>0?'up':last.c<e20[n-1]&&e20[n-1]<e50[n-1]&&slope<0?'down':'range';
 const fvg=[];for(let i=Math.max(2,n-60);i<n;i++){const a=c[i-2],b=c[i];if(b.l>a.h)fvg.push({type:'bull',top:b.l,bottom:a.h,t:c[i-1].t,i});if(b.h<a.l)fvg.push({type:'bear',top:a.l,bottom:b.h,t:c[i-1].t,i})}
 const open=fvg.filter(g=>{const after=c.slice(g.i+1);return g.type=='bull'?!after.some(k=>k.l<g.bottom):!after.some(k=>k.h>g.top)}).filter(g=>g.top-g.bottom>atr*0.15).slice(-5);
 const lb=c.slice(-21,-1),hi=Math.max(...lb.map(k=>k.h)),lo=Math.min(...lb.map(k=>k.l));
 const piv=[];for(let i=n-80>2?n-80:2;i<n-2;i++){const k=c[i];if(k.h>=Math.max(...c.slice(i-2,i+3).map(x=>x.h)))piv.push(k.h);if(k.l<=Math.min(...c.slice(i-2,i+3).map(x=>x.l)))piv.push(k.l)}
 const levels=[...new Set(piv.map(rnd))].sort((a,b)=>Math.abs(a-last.c)-Math.abs(b-last.c)).slice(0,6).sort((a,b)=>b-a);
 const pd=c.slice(-48);return{last:rnd(last.c),time:new Date(last.t).toISOString(),trend,ema20:rnd(e20[n-1]),ema50:rnd(e50[n-1]),atr:rnd(atr),atr_pct:+(atr/last.c*100).toFixed(3),
  range20:{high:rnd(hi),low:rnd(lo)},breakout:last.c>hi?'up':last.c<lo?'down':null,
  open_fvgs:open.map(g=>({type:g.type,top:rnd(g.top),bottom:rnd(g.bottom),formed:new Date(g.t).toISOString(),price_inside:last.l<=g.top&&last.h>=g.bottom})),key_levels:levels,
  recent_high:rnd(Math.max(...pd.map(k=>k.h))),recent_low:rnd(Math.min(...pd.map(k=>k.l))),change_pct:+((last.c/c[Math.max(0,n-25)].c-1)*100).toFixed(2)}}
export async function quote(sym){const {symbol,source,candles:c}=await candles(sym,'5m',300);const l=c[c.length-1];return{symbol,source,price:rnd(l.c),time:new Date(l.t).toISOString(),day_high:rnd(Math.max(...c.slice(-100).map(k=>k.h))),day_low:rnd(Math.min(...c.slice(-100).map(k=>k.l)))}}
export async function events(){let ev=[];for(const u of['https://nfs.faireconomy.media/ff_calendar_thisweek.json','https://flyawayairfrance.github.io/jarvis-vc-qmd7jy/events.json']){try{const r=await fetch(u,{headers:UA});if(r.ok){ev=await r.json();if(ev.length)break}}catch{}}return ev}
export async function calendar(impact='High',hours=72){const now=Date.now();return(await events()).filter(e=>(impact=='All'||e.impact==impact)).map(e=>({...e,ts:Date.parse(e.date)})).filter(e=>e.ts>now-36e5&&e.ts<now+hours*36e5).sort((a,b)=>a.ts-b.ts).slice(0,30).map(e=>({title:e.title,country:e.country,impact:e.impact,bangkok:new Date(e.ts).toLocaleString('en-GB',{timeZone:'Asia/Bangkok',weekday:'short',hour:'2-digit',minute:'2-digit'}),in_hours:+((e.ts-now)/36e5).toFixed(1),forecast:e.forecast,previous:e.previous}))}
export async function news(q){const j=await (await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=8&quotesCount=0`,{headers:UA})).json();return(j.news||[]).map(n=>({title:n.title,publisher:n.publisher,time:new Date(n.providerPublishTime*1000).toISOString(),link:n.link}))}
export const WATCH=['NQ','ES','YM','DAX','GOLD','EURUSD','GBPUSD','USDJPY','AUDUSD','OIL','AAPL','NVDA','TSLA','MSFT','AMZN','META','BTCUSDT','ETHUSDT'];
const CUR={NQ:'USD',ES:'USD',YM:'USD',DAX:'EUR',GOLD:'USD',OIL:'USD',EURUSD:'EUR USD',GBPUSD:'GBP USD',USDJPY:'USD JPY',AUDUSD:'AUD USD'};
export async function scan(){const now=new Date(),wd=new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'})).getDay(),weekend=wd==0||wd==6||(wd==5&&now.getUTCHours()>=21);
 const list=WATCH.filter(s=>weekend?false:true);const alerts=[],errors=[];const cal=await calendar('High',3).catch(()=>[]);
 await Promise.all(list.map(async s=>{try{const {candles:c}=await candles(s,'1h',150);if(c.length<40)return;const a=analyse(c),l=c[c.length-1];if(Date.now()-l.t>3*36e5)return;const base={symbol:s,price:a.last,trend:a.trend,atr:a.atr};
  a.open_fvgs.filter(g=>g.price_inside).forEach(g=>{const w=g.type=='bull'&&a.trend!='down'||g.type=='bear'&&a.trend!='up';if(w)alerts.push({...base,kind:'fvg_retest',dir:g.type=='bull'?'long':'short',text:`${s} retesting 1H ${g.type} FVG ${g.bottom}–${g.top} (trend ${a.trend}). Look for 5m confirmation; stop beyond ${g.type=='bull'?g.bottom:g.top}.`,id:`${s}-fvg-${g.formed}`})});
  if(a.breakout)alerts.push({...base,kind:'breakout',dir:a.breakout=='up'?'long':'short',text:`${s} 1H breakout ${a.breakout} of 20-bar range ${a.range20.low}–${a.range20.high} (trend ${a.trend}). Wait for retest of ${a.breakout=='up'?a.range20.high:a.range20.low}.`,id:`${s}-bo-${a.breakout}-${l.t}`});
 }catch(e){errors.push(s+': '+e.message)}}));
 cal.forEach(e=>{const aff=Object.entries(CUR).filter(([k,v])=>v.includes(e.country)).map(([k])=>k);alerts.push({kind:'news',symbol:aff.slice(0,5).join(', ')||e.country,text:`High-impact ${e.country} ${e.title} at ${e.bangkok} BKK (in ${e.in_hours}h). Expect volatility on ${aff.slice(0,5).join(', ')||e.country}; flat or tight risk 5 min before.`,id:'news-'+e.title+e.bangkok})});
 return{at:Date.now(),weekend,scanned:list.length,alerts:alerts.map(x=>({...x,t:Date.now()})),errors}}
const unx=s=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
export async function headlines(){const feeds=['https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,GC%3DF,EURUSD%3DX,CL%3DF&region=US&lang=en-US','https://www.cnbc.com/id/20910258/device/rss/rss.html','https://www.cnbc.com/id/10000664/device/rss/rss.html'];
 const all=(await Promise.all(feeds.map(async u=>{try{const x=await (await fetch(u,{headers:UA})).text();return [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>{const g=k=>unx((m[1].match(new RegExp(`<${k}>([\\s\\S]*?)</${k}>`))||[])[1]||'');return{title:g('title'),link:g('link'),time:new Date(g('pubDate')).toISOString(),publisher:/cnbc/.test(u)?'CNBC':'Yahoo Finance'}})}catch{return[]}}))).flat();
 const seen=new Set();return all.filter(n=>n.title&&!seen.has(n.title)&&seen.add(n.title)).sort((a,b)=>b.time.localeCompare(a.time)).slice(0,20)}
