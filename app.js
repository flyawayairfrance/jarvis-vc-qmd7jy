'use strict';
const TZ='Asia/Bangkok',$=s=>document.querySelector(s),LS={g:(k,d)=>{try{return JSON.parse(localStorage.getItem('ta_'+k))??d}catch{return d}},s:(k,v)=>localStorage.setItem('ta_'+k,JSON.stringify(v))};
let S=LS.g('settings',{acct:10000,risk:1,stop:3,max:4});let plans=LS.g('plans',{}),prefs=LS.g('prefs',{}),trades=LS.g('trades',[]),events=LS.g('events',[]),manualEv=LS.g('manualEv',[]),fired=LS.g('fired',{});
const pad=n=>String(n).padStart(2,'0'),fmtM=m=>pad(Math.floor(((m%1440)+1440)%1440/60))+':'+pad(((m%60)+60)%60),money=v=>(v<0?'-$':'$')+Math.abs(v).toFixed(2);
function bkParts(d){const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const o={};p.forEach(x=>o[x.type]=x.value);return o}
const bkDate=d=>{const o=bkParts(d);return `${o.year}-${o.month}-${o.day}`},bkMin=d=>{const o=bkParts(d);return +o.hour*60+ +o.minute};
function offMin(zone,d){const p=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'}).formatToParts(d).find(x=>x.type==='timeZoneName').value;const m=p.match(/([+-])(\d\d):?(\d\d)?/);return m?(m[1]=='-'?-1:1)*(+m[2]*60+ +(m[3]||0)):0}
// minutes in Bangkok-day `day` when local time hh:mm occurs in zone on that calendar date
function zoneToBk(day,zone,h,mi){const base=new Date(day+'T12:00:00Z');const off=offMin(zone,base);const utc=Date.UTC(+day.slice(0,4),+day.slice(5,7)-1,+day.slice(8,10),h,mi)-off*60000;return (utc-Date.parse(day+'T00:00:00+07:00'))/60000}
function sessions(day){return[
 {k:'tokyo',n:'Tokyo',c:'#e05d8c',s:zoneToBk(day,'Asia/Tokyo',9,0),e:zoneToBk(day,'Asia/Tokyo',15,0)},
 {k:'london',n:'London',c:'#4f8cff',s:zoneToBk(day,'Europe/London',8,0),e:zoneToBk(day,'Europe/London',16,30)},
 {k:'ny',n:'New York',c:'#26c281',s:zoneToBk(day,'America/New_York',8,0),e:zoneToBk(day,'America/New_York',17,0)},
 {k:'cash',n:'US cash',c:'#d4af37',s:zoneToBk(day,'America/New_York',9,30),e:zoneToBk(day,'America/New_York',16,0)}]}
const isWeekend=day=>{const w=new Date(day+'T12:00:00Z').getUTCDay();return w==0||w==6};
function allEvents(){return[...events,...manualEv].map(e=>({...e,t:Date.parse(e.date)})).filter(e=>!isNaN(e.t)).sort((a,b)=>a.t-b.t)}
function dayEvents(day){const s=Date.parse(day+'T00:00:00+07:00');return allEvents().filter(e=>e.t>=s&&e.t<s+864e5&&e.impact=='High').map(e=>({...e,m:(e.t-s)/60000}))}
function goal(prime){const r=S.acct*S.risk/100;return{pnl:+(r*(prime?1.5:1)).toFixed(0),trades:prime?3:2,process:prime?'Only A+ setups, wait for 5-min confirmation, no trades 5 min around news':'Follow the plan, stop after 2 losses'}}
function propose(day){
 if(isWeekend(day))return[];const ss=sessions(day),g=k=>ss.find(x=>x.k==k);
 let b=[{key:'tokyo',title:'Tokyo open – JPY pairs, gold',s:g('tokyo').s,e:g('tokyo').s+120,prime:false},
 {key:'london',title:'London open – EUR/GBP, gold, DAX',s:g('london').s,e:g('london').s+120,prime:true},
 {key:'cash',title:'US cash open + London/NY overlap – stocks, NQ/ES, gold',s:g('cash').s-30,e:g('cash').s+120,prime:true}];
 const ev=dayEvents(day);
 b=b.map(x=>{const p=prefs[x.key];if(p){if(p.del>=2)return null;x.s+=p.shift||0;x.e=x.s+(p.dur||x.e-x.s)}const near=ev.filter(e=>e.m>=x.s-30&&e.m<=x.e);x.note=near.length?'⚠ News: '+near.map(e=>fmtM(e.m)+' '+e.title).join(', '):'';return x}).filter(x=>x&&x.s>=0&&x.e<=1440);
 return b.map((x,i)=>({id:Date.now()+i,...x,goal:goal(x.prime),review:''}))}
let day=bkDate(new Date());
const plan=()=>plans[day]||(plans[day]=propose(day),LS.s('plans',plans),plans[day]);
function learn(b){if(!b.key)return;const p0=propose0(b.key);if(!p0)return;prefs[b.key]={...(prefs[b.key]||{}),shift:b.s-p0.s,dur:b.e-b.s};LS.s('prefs',prefs)}
function propose0(key){const ss=sessions(day),g=k=>ss.find(x=>x.k==k).s;return{tokyo:{s:g('tokyo')},london:{s:g('london')},cash:{s:g('cash')-30}}[key]}
function renderPlan(){window.calRender&&calRender();renderChecklist()}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function save(){LS.s('plans',plans)}
const shiftDay=n=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);day=d.toISOString().slice(0,10);renderPlan()};
const CHECK=['Slept & focused (mood 1-5 ≥ 3)','Checked news calendar for this session','Marked key levels on watchlist','Know my max loss today','Setups defined: entry, stop, target before clicking','No revenge trades after a loss'];
function renderChecklist(){const c=LS.g('check_'+day,[]);$('#checklist').innerHTML=CHECK.map((t,i)=>`<label style="color:var(--tx)"><input type="checkbox" data-i="${i}" ${c[i]?'checked':''} style="display:inline;width:auto"> ${t}</label>`).join('')}
$('#checklist').addEventListener('change',e=>{const c=LS.g('check_'+day,[]);c[e.target.dataset.i]=e.target.checked;LS.s('check_'+day,c)});
// News
const FF='https://nfs.faireconomy.media/ff_calendar_thisweek.json';
async function loadNews(){const src=[['events.json?'+Date.now(),'Forex Factory (synced)'],['https://corsproxy.io/?url='+encodeURIComponent(FF),'Forex Factory (proxy)'],['https://api.allorigins.win/raw?url='+encodeURIComponent(FF),'Forex Factory (proxy 2)']];
 for(const[u,n]of src){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)&&j.length){events=j.filter(e=>e.impact=='High'||e.impact=='Medium').map(e=>({title:e.title,country:e.country,date:e.date,impact:e.impact,forecast:e.forecast,previous:e.previous}));LS.s('events',events);LS.s('newsAt',Date.now());$('#newsSrc').textContent='Source: '+n;renderNews();renderPlan();return}}catch(e){}}
 $('#newsSrc').textContent=events.length?'Live feed unavailable – showing cached events from '+new Date(LS.g('newsAt',0)).toLocaleString():'Live feed unavailable – use the calendar widget below and add key events manually.';renderNews()}
function renderNews(){const now=Date.now(),list=allEvents().filter(e=>e.t>now-36e5*3);const bl=Object.values(plans).flat();
 $('#events').innerHTML=list.length?'<table>'+list.map(e=>{const d=new Date(e.t);const inS=nearSession(e.t);return `<tr><td>${d.toLocaleString('en-GB',{timeZone:TZ,weekday:'short',hour:'2-digit',minute:'2-digit'})}</td><td>${esc(e.country||'')}</td><td>${esc(e.title)}${e.impact=='High'?'<span class="tag">probable move</span>':''}${inS?'<span class="tag" style="background:#4a3b12;color:#ffd770">in your session</span>':''}</td><td class="muted">${e.forecast?'F '+esc(e.forecast):''} ${e.previous?'P '+esc(e.previous):''}</td></tr>`}).join('')+'</table>':'<p class="muted">No upcoming events loaded.</p>'}
function nearSession(t){const d=bkDate(new Date(t)),m=bkMin(new Date(t));return(plans[d]||[]).some(b=>m>=b.s-60&&m<=b.e+15)}
function alertTick(){const now=Date.now();allEvents().filter(e=>e.impact=='High').forEach(e=>{[30,15,5].forEach(th=>{const k=e.title+e.t+th,dm=(e.t-now)/60000;if(dm<=th&&dm>th-1.5&&!fired[k]){fired[k]=1;LS.s('fired',fired);const msg=`${th} min: ${e.country||''} ${e.title} – probable volatility${nearSession(e.t)?' during your planned session':''}`;showBanner(msg,'warn');if(window.Notification&&Notification.permission=='granted')new Notification('Trading Assistant',{body:msg})}})})}
function showBanner(m,c){const b=$('#banner');b.textContent=m;b.className=c||'';clearTimeout(b._t);b._t=setTimeout(()=>{if(!riskLocked())b.className='hidden'},60000)}
$('#notifBtn').onclick=()=>window.Notification&&Notification.requestPermission().then(p=>$('#notifBtn').textContent='Notifications: '+p);
$('#reloadNews').onclick=loadNews;$('#evAdd').onclick=()=>{const t=$('#evTitle').value,v=$('#evTime').value;if(!t||!v)return;manualEv.push({title:t,date:v+':00+07:00',impact:'High',country:'Manual'});LS.s('manualEv',manualEv);renderNews();renderPlan()};
// Journal
function parseCSV(txt){const rows=[];let r=[],f='',q=false;for(let i=0;i<txt.length;i++){const c=txt[i];if(q){if(c=='"'){if(txt[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&txt[i+1]=='\n')i++;r.push(f);rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows.filter(x=>x.some(v=>v.trim()))}
const num=v=>{v=String(v??'').replace(/[^0-9.\-]/g,'');return v===''?NaN:+v};
$('#csv').onchange=async e=>{const file=e.target.files[0];if(!file)return;const rows=parseCSV(await file.text());const H=rows.shift().map(h=>h.trim().toLowerCase());const find=(...ks)=>H.findIndex(h=>ks.some(k=>h.includes(k)));
 const iPr=find('avg fill','fill price','price'),iQ=find('qty','quantity','size'),iP=find('realized p&l','realised','profit','p&l','pnl'),iT=find('closing time','close time','time','date'),iS=find('symbol','ticker','instrument'),iSide=find('side','direction','type'),iA=find('action');let n=0;
 rows.forEach(r=>{const pnl=num(r[iP]);if(iP<0||isNaN(pnl)||pnl===0&&iA>=0&&!/close/i.test(r[iA]||''))return;let sym=iS>=0?r[iS]:'',side=iSide>=0?r[iSide]:'';if(iA>=0){const a=r[iA]||'';if(!/close/i.test(a))return;sym=sym||(a.match(/symbol\s+([A-Z0-9_:.!\/]+)/i)||[])[1]||'';side=side||(/short/i.test(a)?'Short':'Long')}
  const t=Date.parse((r[iT]||'').replace(' ','T'));const id=(r[iT]||'')+sym+pnl;if(trades.some(x=>x.id==id))return;trades.push({id,sym:sym||'?',side,t:isNaN(t)?Date.now():t,pnl,r:null,note:'CSV',exit:num(r[iPr]),qty:num(r[iQ]),entry:iA>=0?num(((r[iA]||'').match(/at price\s+([0-9.]+)/i)||[])[1]):NaN});n++});
 LS.s('trades',trades);$('#csvMsg').textContent=iP<0?' Could not find a P&L column – headers: '+H.join(', '):` Imported ${n} trades.`;renderJournal()};
$('#tAdd').onclick=()=>{const pnl=num($('#tPnl').value);if(isNaN(pnl))return;const t=$('#tDate').value?Date.parse($('#tDate').value+':00+07:00'):Date.now();const r=num($('#tR').value);trades.push({id:'m'+Date.now(),sym:$('#tSym').value.toUpperCase()||'?',side:$('#tSide').value,t,pnl,r:isNaN(r)?+(pnl/(S.acct*S.risk/100)).toFixed(2):r,note:$('#tNote').value,entry:num($('#tEntry').value),stop:num($('#tStop').value),exit:num($('#tExit').value),qty:num($('#tQty').value),held:num($('#tMin').value)});LS.s('trades',trades);renderJournal()};
function sesOf(t){const m=bkMin(new Date(t)),ss=sessions(bkDate(new Date(t)));const c=ss.find(s=>s.k=='cash'),l=ss.find(s=>s.k=='london');if(m>=c.s-30||m<120)return'New York';if(m>=l.s)return'London';if(m>=360)return'Tokyo';return'Off-hours'}
function group(f){const o={};trades.forEach(t=>{const k=f(t);o[k]=o[k]||{n:0,p:0,w:0};o[k].n++;o[k].p+=t.pnl;if(t.pnl>0)o[k].w++});return'<table>'+Object.entries(o).sort().map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.n}</td><td>${Math.round(v.w/v.n*100)}%</td><td class="${v.p>=0?'pos':'neg'}">${money(v.p)}</td></tr>`).join('')+'</table>'}
function renderJournal(){trades.sort((a,b)=>a.t-b.t);const tot=trades.reduce((a,t)=>a+t.pnl,0),w=trades.filter(t=>t.pnl>0),l=trades.filter(t=>t.pnl<0),rs=trades.map(t=>t.r??t.pnl/(S.acct*S.risk/100));
 const st=[['Net P&L',money(tot),tot>=0?'pos':'neg'],['Trades',trades.length],['Win rate',trades.length?Math.round(w.length/trades.length*100)+'%':'–'],['Avg R',rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(2):'–'],['Avg win',w.length?money(w.reduce((a,t)=>a+t.pnl,0)/w.length):'–','pos'],['Avg loss',l.length?money(l.reduce((a,t)=>a+t.pnl,0)/l.length):'–','neg']];
 $('#stats').innerHTML=st.map(([a,b,c])=>`<div class="stat"><span class="muted">${a}</span><b class="${c||''}">${b}</b></div>`).join('');
 $('#byDay').innerHTML=group(t=>bkDate(new Date(t.t)));$('#bySes').innerHTML=group(t=>sesOf(t.t));$('#bySym').innerHTML=group(t=>t.sym);
 $('#trades').innerHTML='<table>'+trades.slice().reverse().map(t=>`<tr><td>${new Date(t.t).toLocaleString('en-GB',{timeZone:TZ,dateStyle:'short',timeStyle:'short'})}</td><td>${esc(t.sym)}</td><td>${esc(t.side)}</td><td class="${t.pnl>=0?'pos':'neg'}">${money(t.pnl)}</td><td>${esc(t.note||'')}</td><td><button data-a="${esc(t.id)}">Analyse</button></td><td><button data-x="${esc(t.id)}">✕</button></td></tr>`).join('')+'</table>';
 drawEquity();renderRisk();window.renderCoach&&renderCoach()}
$('#trades').addEventListener('click',e=>{const id=e.target.dataset.x;if(id==null)return;trades=trades.filter(t=>String(t.id)!==id);LS.s('tradesDel',[...LS.g('tradesDel',[]),id]);LS.s('trades',trades);renderJournal()});
function drawEquity(){const c=$('#equity'),x=c.getContext('2d');c.width=c.clientWidth*devicePixelRatio;c.height=180*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);const W=c.clientWidth,H=180;let eq=[S.acct];trades.forEach(t=>eq.push(eq[eq.length-1]+t.pnl));const mn=Math.min(...eq),mx=Math.max(...eq),sp=mx-mn||1;
 x.strokeStyle='#d4af37';x.lineWidth=2;x.beginPath();eq.forEach((v,i)=>{const px=10+i*(W-20)/Math.max(1,eq.length-1),py=H-15-(v-mn)/sp*(H-30);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.fillStyle='#8a93a6';x.font='11px sans-serif';x.fillText('Equity '+money(eq[eq.length-1]),12,14)}
// Risk
const todayTrades=()=>trades.filter(t=>bkDate(new Date(t.t))==bkDate(new Date()));
function riskLocked(){return todayTrades().reduce((a,t)=>a+t.pnl,0)<=-S.acct*S.stop/100}
function renderRisk(){const tt=todayTrades(),p=tt.reduce((a,t)=>a+t.pnl,0),lim=S.acct*S.stop/100,lock=riskLocked(),over=tt.length>=S.max;
 $('#riskToday').innerHTML=`P&L today: <b class="${p>=0?'pos':'neg'}">${money(p)}</b><br>Daily stop: -${money(lim)} (${Math.min(100,Math.max(0,-p/lim*100)).toFixed(0)}% used)<br>Trades: ${tt.length}/${S.max}<br>Risk per trade: ${money(S.acct*S.risk/100)}`;
 const bd=$('#riskBadge');bd.textContent=lock?'LOCKED – daily stop hit':over?'Max trades reached':'Risk OK';bd.className='badge'+(lock||over?' bad':'');
 if(lock){$('#banner').textContent='🛑 Daily loss stop hit. Session locked – close the platform, write your review, come back tomorrow.';$('#banner').className='';$('#tAdd').disabled=false}
 ['sAcct','sRisk','sStop','sMax'].forEach((k,i)=>$('#'+k).value=[S.acct,S.risk,S.stop,S.max][i]);calc()}
$('#sSave').onclick=()=>{S={acct:+$('#sAcct').value||10000,risk:+$('#sRisk').value||1,stop:+$('#sStop').value||3,max:+$('#sMax').value||4};LS.s('settings',S);renderJournal()};
function calc(){const e=num($('#pEntry').value),s=num($('#pStop').value),pv=num($('#pPv').value)||1,r=S.acct*S.risk/100;$('#pOut').innerHTML=isNaN(e)||isNaN(s)||e==s?`Risk: ${money(r)}`:`Size: <b>${(r/(Math.abs(e-s)*pv)).toFixed(3)}</b> units · risk ${money(r)}`}
['pEntry','pStop','pPv'].forEach(k=>$('#'+k).oninput=calc);
// TradingView widgets
function tv(el,name,cfg){const c=$(el);if(c.dataset.on)return;c.dataset.on=1;c.innerHTML='<div class="tradingview-widget-container" style="height:100%"><div class="tradingview-widget-container__widget" style="height:100%"></div></div>';const s=document.createElement('script');s.src=`https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`;s.async=true;s.innerHTML=JSON.stringify({colorTheme:'dark',isTransparent:true,locale:'en',...cfg});c.firstChild.appendChild(s)}
const SYMS=[['FOREXCOM:SPXUSD','S&P 500'],['FOREXCOM:NSXUSD','Nasdaq 100'],['FX:EURUSD','EUR/USD'],['FX:USDJPY','USD/JPY'],['OANDA:XAUUSD','Gold'],['TVC:USOIL','WTI Oil'],['BITSTAMP:BTCUSD','Bitcoin'],['NASDAQ:AAPL','AAPL'],['NASDAQ:NVDA','NVDA'],['NASDAQ:TSLA','TSLA']];
tv('#ticker','ticker-tape',{symbols:SYMS.map(([proName,title])=>({proName,title})),displayMode:'adaptive'});
const lazy={market(){tv('#chart','advanced-chart',{autosize:true,symbol:'OANDA:XAUUSD',interval:'15',timezone:TZ,style:'1',allow_symbol_change:true,withdateranges:true});tv('#overview','market-overview',{width:'100%',height:'100%',showChart:true,tabs:[{title:'Indices',symbols:[{s:'FOREXCOM:SPXUSD'},{s:'FOREXCOM:NSXUSD'},{s:'FOREXCOM:DJI'},{s:'INDEX:DEU40'},{s:'INDEX:NKY'}]},{title:'Forex',symbols:[{s:'FX:EURUSD'},{s:'FX:GBPUSD'},{s:'FX:USDJPY'},{s:'FX:AUDUSD'}]},{title:'Commodities',symbols:[{s:'OANDA:XAUUSD'},{s:'TVC:USOIL'},{s:'TVC:SILVER'}]},{title:'Stocks',symbols:[{s:'NASDAQ:AAPL'},{s:'NASDAQ:NVDA'},{s:'NASDAQ:TSLA'},{s:'NASDAQ:MSFT'}]},{title:'Crypto',symbols:[{s:'BITSTAMP:BTCUSD'},{s:'BITSTAMP:ETHUSD'}]}]})},
 news(){tv('#econ','events',{width:'100%',height:'100%',importanceFilter:'0,1',countryFilter:'us,eu,gb,jp,cn,au,ca,ch,de'});tv('#timelineNews','timeline',{feedMode:'all_symbols',displayMode:'regular',width:'100%',height:'100%'})}};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button,.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#'+b.dataset.t).classList.add('on');lazy[b.dataset.t]&&lazy[b.dataset.t]();if(b.dataset.t=='journal')drawEquity()});
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit'})+' BKK';alertTick()},15000);
$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit'})+' BKK';
renderPlan();renderJournal();renderNews();loadNews();
