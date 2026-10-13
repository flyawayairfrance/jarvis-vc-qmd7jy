/* JARVIS Follow mode: navigates to whatever Jarvis changed, highlights and animates it. window.JarvisFollow.play([{name,args,desc,blockId,date}]) */
(()=>{const LSg=(k,d)=>{try{return JSON.parse(localStorage.getItem('ta_'+k))??d}catch{return d}};
let on=LSg('follow',true),q=[],busy=false;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cap=document.createElement('div');cap.id='jvCaption';cap.className='hidden';document.body.appendChild(cap);
const ring=document.createElement('div');ring.id='jvRing';ring.className='hidden';document.body.appendChild(ring);
function tab(t){const b=document.querySelector(`#tabs button[data-t="${t}"]`);if(b&&!b.classList.contains('on'))(window.JARVIS_NAV||(x=>b.click()))(t)}
function say(t){cap.innerHTML='<b>Jarvis:</b> '+String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));cap.classList.remove('hidden')}
async function focus(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});await wait(450);const r=el.getBoundingClientRect();
 Object.assign(ring.style,{left:r.left-6+'px',top:r.top-6+'px',width:r.width+12+'px',height:r.height+12+'px'});ring.classList.remove('hidden');el.classList.add('jv-glow');setTimeout(()=>el.classList.remove('jv-glow'),2600)}
async function type(el,val){if(!el)return;await focus(el);const v=String(val??el.value);el.value='';for(const ch of v){el.value+=ch;await wait(55)}el.dispatchEvent(new Event('input',{bubbles:true}))}
const steps={
 async block(a){tab('plan');if(a.date&&typeof day!='undefined'&&day!==a.date){day=a.date;renderPlan()}await wait(250);const el=document.querySelector(`.ev2[data-id="${a.blockId}"]`)||document.getElementById('cal');await focus(el);if(el&&el.classList.contains('ev2')){el.style.transformOrigin='top';el.animate([{transform:'scaleY(.2)',opacity:.3},{transform:'scaleY(1)',opacity:1}],{duration:700,easing:'ease-out'})}},
 async risk(a){tab('risk');await wait(250);const g=a.args||{},m={account_size:'#sAcct',risk_pct:'#sRisk',daily_stop_pct:'#sStop',max_trades_per_day:'#sMax'};let any=0;
  for(const k in m){const el=document.querySelector(m[k]);if(el&&(g[k]!=null||a.name=='apply_recommendation')){await type(el,el.value);any=1}}if(!any)await focus(document.querySelector('#sAcct'))},
 async prep(a){tab('prep');await wait(300);const i=((a.args||{}).step||1)-1;const el=document.querySelectorAll('#prepSteps .card, #prepSteps > *')[i]||document.getElementById('prepSteps');await focus(el)},
 async journal(){tab('journal');await wait(300);await focus(document.querySelector('#trades tr')||document.getElementById('trades'))},
 async alerts(){tab('news');await wait(300);await focus(document.getElementById('jarvisNewsReports')||document.getElementById('events'))},
 async generic(a){if(a.tab)tab(a.tab);await wait(300);if(a.selector)await focus(document.querySelector(a.selector))}};
const route0=n=>/block|goal/.test(n)?'block':/risk|recommend/.test(n)?'risk':/prep/.test(n)?'prep':/journal|trade/.test(n)?'journal':/alert|news|report/.test(n)?'alerts':'generic';
const route=(n,a)=>a&&a.tab?'generic':route0(n);async function run(){if(busy)return;busy=true;while(q.length){const a=q.shift();try{say(a.desc||a.name);await steps[route(a.name||'',a)](a);await wait(1500)}catch(e){console.warn('follow',e)}}
 await wait(600);cap.classList.add('hidden');ring.classList.add('hidden');busy=false}
addEventListener('scroll',()=>ring.classList.add('hidden'),{passive:true});
window.JarvisFollow={play(list){if(!on||!list||!list.length)return;q.push(...[].concat(list));run()},get on(){return on},set(v){on=!!v;localStorage.setItem('ta_follow',JSON.stringify(on));paint()}};
function paint(){const b=document.getElementById('jvFollowBtn');if(b){b.textContent=(on?'👁 Follow: on':'👁 Follow: off');b.classList.toggle('on',on)}}
function mount(){const host=document.getElementById('chat');if(!host||document.getElementById('jvFollowBtn'))return;const b=document.createElement('button');b.id='jvFollowBtn';b.type='button';b.title='Show me each change Jarvis makes';b.onclick=()=>JarvisFollow.set(!on);host.prepend(b);paint()}
mount();})();
