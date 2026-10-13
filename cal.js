(()=>{const HH=48,P=HH/60;let view=LS.g('calView',innerWidth>=900?'week':'day'),edit=null;
const cat=b=>{const t=(b.title||'').toLowerCase();if(/review|journal/.test(t))return'review';if(/prep/.test(t))return'prep';if(b.key=='tokyo'||/tokyo|asia|sydney/.test(t))return'asia';if(b.key=='london'||/london|dax|frankfurt/.test(t))return'london';if(b.key=='cash'||b.key=='ny'||/ny|new york|us |nasdaq|cash/.test(t))return'ny';return'custom'};
const addD=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const dow=d=>(new Date(d+'T12:00:00Z').getUTCDay()+6)%7;
const lbl=(d,o)=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{timeZone:'UTC',...o});
const getP=d=>d==day?plan():(plans[d]||(plans[d]=propose(d)));
function lanes(bl){const s=bl.slice().sort((a,b)=>a.s-b.s),end=[];s.forEach(b=>{let i=end.findIndex(e=>e<=b.s);if(i<0){i=end.length;end.push(0)}end[i]=b.e;b._l=i});s.forEach(b=>{b._n=Math.max(...s.filter(o=>o.s<b.e&&o.e>b.s).map(o=>o._l))+1});return s}
window.calRender=function(){const today=bkDate(new Date());$('#day').value=day;
 const days=view=='week'?[...Array(7)].map((_,i)=>addD(day,i-dow(day))):[day];
 $('#calTitle').textContent=view=='week'?lbl(days[0],{day:'numeric',month:'short'})+' – '+lbl(days[6],{day:'numeric',month:'short',year:'numeric'}):lbl(day,{weekday:'long',day:'numeric',month:'long'});
 document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.v==view));
 const ss=sessions(day);$('#dayNote').textContent=isWeekend(day)&&view=='day'?'Weekend – markets closed':'';
 let h=`<div class="calhead" style="--n:${days.length}"><div></div>${days.map(d=>`<button class="dh${d==today?' td':''}" data-d="${d}"><small>${lbl(d,{weekday:'short'})}</small><b>${lbl(d,{day:'numeric'})}</b></button>`).join('')}</div><div class="calscroll"><div class="calgrid" style="--n:${days.length};height:${24*HH}px"><div class="gut">${[...Array(24)].map((_,i)=>`<span style="top:${i*HH}px">${pad(i)}:00</span>`).join('')}</div>`;
 days.forEach(d=>{h+=`<div class="col${isWeekend(d)?' we':''}" data-d="${d}">`;
  if(!isWeekend(d))sessions(d).filter(s=>s.k!='cash').forEach(s=>{const a=Math.max(0,s.s),z=Math.min(1440,s.e);if(z>a)h+=`<div class="ses s-${s.k}" style="top:${a*P}px;height:${(z-a)*P}px">${view=='day'?`<em>${s.n}</em>`:''}</div>`});
  dayEvents(d).forEach(e=>h+=`<div class="evl" style="top:${e.m*P}px"><em>${fmtM(e.m)} ${esc(e.title)}</em></div>`);
  if(d==today)h+=`<div class="nowl" style="top:${bkMin(new Date())*P}px"></div>`;
  lanes(getP(d)).forEach(b=>{const ht=Math.max(22,(b.e-b.s)*P);h+=`<div class="ev2 c-${cat(b)}" data-d="${d}" data-id="${b.id}" style="top:${b.s*P}px;height:${ht}px;left:calc(${b._l/b._n*100}% + 2px);width:calc(${100/b._n}% - 4px)"><b>${esc(b.title)}</b><span>${fmtM(b.s)}–${fmtM(b.e)}${b.symbol?' · '+esc(b.symbol):''}</span>${ht>60&&b.goal?`<span class="g">🎯 ${b.goal.pnl?'$'+b.goal.pnl+' · ':''}${esc(b.goal.process||'')}</span>`:''}${b.note&&ht>80?`<span class="w">${esc(b.note)}</span>`:''}</div>`});
  h+='</div>'});
 const sc=document.querySelector('.calscroll'),top=sc?sc.scrollTop:null;$('#cal').innerHTML=h+'</div></div>';
 const ns=document.querySelector('.calscroll');const fb=Math.min(...days.flatMap(d=>getP(d).map(b=>b.s)),days.includes(today)?bkMin(new Date())-90:420);ns.scrollTop=top??Math.max(0,(fb-30)*P)};
function open(d,b,isNew){edit={d,b,isNew};const f=$('#sheetF');$('#sheetT').textContent=isNew?'New block':'Edit block';f.title.value=b.title;f.d.value=d;f.symbol.value=b.symbol||'';f.s.value=fmtM(b.s);f.e.value=fmtM(b.e);f.pnl.value=b.goal?.pnl??'';f.trades.value=b.goal?.trades??'';f.process.value=b.goal?.process||'';f.review.value=b.review||'';$('#sheetNote').textContent=b.note||'';$('#sheetDel').classList.toggle('hidden',isNew);$('#sheet').classList.remove('hidden');setTimeout(()=>f.title.focus(),50)}
const close=()=>{$('#sheet').classList.add('hidden');edit=null};
const tm=v=>{const[a,c]=v.split(':');return +a*60+ +c};
$('#sheetF').onsubmit=e=>{e.preventDefault();const f=e.target,{d,b,isNew}=edit;const nd=f.d.value||d;
 Object.assign(b,{title:f.title.value,symbol:f.symbol.value.trim()||undefined,s:tm(f.s.value),e:tm(f.e.value),review:f.review.value,goal:{...(b.goal||{}),pnl:+f.pnl.value||0,trades:+f.trades.value||0,process:f.process.value}});if(b.e<=b.s)b.e=Math.min(1440,b.s+30);
 if(!isNew)plans[d]=getP(d).filter(x=>x!==b);getP(nd).push(b);const od=day;day=nd;learn(b);day=od;save();close();renderPlan()};
$('#sheetDel').onclick=()=>{const{d,b}=edit;if(b.key){prefs[b.key]={...(prefs[b.key]||{}),del:((prefs[b.key]||{}).del||0)+1};LS.s('prefs',prefs)}plans[d]=getP(d).filter(x=>x!==b);save();close();renderPlan()};
$('#sheetX').onclick=$('#sheetCancel').onclick=close;$('#sheet').onclick=e=>{if(e.target.id=='sheet')close()};addEventListener('keydown',e=>{if(e.key=='Escape'&&edit)close()});
$('#cal').addEventListener('click',e=>{const dh=e.target.closest('.dh');if(dh){day=dh.dataset.d;view='day';LS.s('calView',view);renderPlan();return}
 const ev=e.target.closest('.ev2');if(ev){if(ev._dragged)return;const b=getP(ev.dataset.d).find(x=>x.id==ev.dataset.id);b&&open(ev.dataset.d,b);return}
 const col=e.target.closest('.col');if(col){const r=col.getBoundingClientRect();const s=Math.min(1380,Math.max(0,Math.floor((e.clientY-r.top)/P/30)*30));open(col.dataset.d,{id:Date.now(),title:'New session',s,e:s+60,goal:goal(false),review:''},true)}});
$('#cal').addEventListener('pointerdown',e=>{const el=e.target.closest('.ev2');if(!el||e.pointerType!='mouse')return;const b=getP(el.dataset.d).find(x=>x.id==el.dataset.id);const y0=e.clientY,s0=b.s,dur=b.e-b.s;el._dragged=false;
 const mv=ev=>{const d=Math.round((ev.clientY-y0)/P/15)*15;if(Math.abs(ev.clientY-y0)>5)el._dragged=true;b.s=Math.min(1440-dur,Math.max(0,s0+d));b.e=b.s+dur;el.style.top=b.s*P+'px'};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(b.s!=s0){const od=day;day=el.dataset.d;learn(b);day=od;save();renderPlan()}setTimeout(()=>el._dragged=false,0)};addEventListener('pointermove',mv);addEventListener('pointerup',up)});
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{view=b.dataset.v;LS.s('calView',view);renderPlan()});
$('#prevDay').onclick=()=>shiftDay(view=='week'?-7:-1);$('#nextDay').onclick=()=>shiftDay(view=='week'?7:1);$('#todayBtn').onclick=()=>{day=bkDate(new Date());renderPlan()};
$('#day').onchange=e=>{day=e.target.value||day;renderPlan()};
$('#propose').onclick=()=>{const ds=view=='week'?[...Array(7)].map((_,i)=>addD(day,i-dow(day))):[day];if(ds.some(d=>(plans[d]||[]).length)&&!confirm('Replace blocks with suggested times?'))return;ds.forEach(d=>plans[d]=propose(d));save();renderPlan()};
$('#addBlock').onclick=()=>open(day,{id:Date.now(),title:'New session',s:600,e:690,goal:goal(false),review:''},true);
setInterval(()=>{const n=document.querySelector('.nowl');if(n)n.style.top=bkMin(new Date())*P+'px'},60000);
renderPlan()})();
