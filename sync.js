'use strict';
// Cloud sync: must load BEFORE app.js. Wraps localStorage ta_* writes with timestamps + debounced push.
(()=>{const API='https://trading-assistant-api-r2rdjjf2yc-4746.vercel.app/api/',P='ta_',TS='tasync_ts',TK='tasync_token',EM='tasync_email';
const raw={set:localStorage.setItem.bind(localStorage),get:localStorage.getItem.bind(localStorage)};
const tsMap=()=>{try{return JSON.parse(raw.get(TS))||{}}catch{return{}}};let timer=null,status='local';const dirty=new Set(JSON.parse(raw.get('tasync_dirty')||'[]'));const saveDirty=()=>raw.set('tasync_dirty',JSON.stringify([...dirty]));
localStorage.setItem=function(k,v){const o=raw.get(k);raw.set(k,v);if(k.startsWith(P)&&o!==String(v)){const m=tsMap();m[k]=Date.now();raw.set(TS,JSON.stringify(m));dirty.add(k);saveDirty();if(k=='ta_chat'){clearTimeout(timer);push()}else schedule()}};
function dirtyPayload(){const keys={},ts={},m=tsMap();dirty.forEach(k=>{const v=raw.get(k);if(v!=null){keys[k]=v;ts[k]=m[k]||Date.now()}});return{keys,ts}}
function allLocal(){const keys={},m=tsMap(),ts={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(P)){keys[k]=raw.get(k);ts[k]=m[k]||1}}return{keys,ts}}
const token=()=>raw.get(TK);
function wipe(){clearTimeout(timer);dirty.clear();raw.set('tasync_dirty','[]');const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(P))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k));localStorage.removeItem(TS)}
async function call(path,method,body){const r=await fetch(API+path,{method:method||'GET',headers:{'content-type':'application/json',...(token()?{authorization:'Bearer '+token()}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.code=r.status;throw e}return j}
function apply(st){const m=tsMap();let ch=0;for(const k in st.keys||{}){if(!dirty.has(k)&&(st.ts[k]||0)>(m[k]||0)&&raw.get(k)!==st.keys[k]){raw.set(k,st.keys[k]);m[k]=st.ts[k];ch++}}raw.set(TS,JSON.stringify(m));return ch}
let inflight=null,again=false;
async function push(force){if(inflight){again=true;return inflight}inflight=doPush(force);try{await inflight}finally{inflight=null}if(again){again=false;return push()}}
async function doPush(force){if(!token())return;if(!navigator.onLine){setStatus('offline – saved on device');return}try{setStatus('syncing…');const pl=dirtyPayload();if(!Object.keys(pl.keys).length&&!force){setStatus('✓ synced');return}const sent={...pl.keys};const st=await call('state','PUT',force?allLocal():pl);for(const k in sent)if(raw.get(k)===sent[k])dirty.delete(k);saveDirty();const ch=apply(st);setStatus('✓ synced '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}));if(ch)softReload()}catch(e){if(e.code==401)signOutLocal();setStatus('sync failed – saved on device, will retry')}}
function schedule(){if(!token())return;clearTimeout(timer);timer=setTimeout(push,1500)}
async function pull(){if(!token()||!navigator.onLine)return;try{const st=await call('state');if(apply(st))softReload();setStatus('✓ synced')}catch(e){if(e.code==401)signOutLocal()}}
function softReload(){if(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;sessionStorage.setItem('tasync_reloaded',1);location.reload()}
function signOutLocal(){localStorage.removeItem(TK);setStatus('signed out');renderAcct()}
function setStatus(s){status=s;const el=document.querySelector('#acctHdr span');if(el)el.title=(raw.get(EM)||'')+' · Sync: '+s}
async function auth(kind,email,pw){const j=await call(kind,'POST',{email,password:pw});wipe();raw.set(TK,j.token);raw.set(EM,j.email);if(kind=='login'){const st=await call('state'),m={};for(const k in st.keys||{}){raw.set(k,st.keys[k]);m[k]=st.ts[k]||1}raw.set(TS,JSON.stringify(m))}setStatus('✓ synced');history.replaceState(null,'',location.pathname);location.reload()}
function renderAcct(){const h=document.getElementById('acctHdr');if(!h)return;const t=token();
 h.innerHTML=t?`<span title="${raw.get(EM)} · Sync: ${status}" style="display:flex;gap:6px;align-items:center"><b class="av">${(raw.get(EM)||'?')[0].toUpperCase()}</b><span class="em">${raw.get(EM)}</span></span><button id="signOut">Sign out</button>`:`<button id="signInBtn" class="pri">Sign in</button>`;
 if(t)document.getElementById('signOut').onclick=()=>{const tk=token();clearTimeout(timer);localStorage.removeItem('tasync_skip');localStorage.removeItem(TK);localStorage.removeItem(EM);wipe();location.hash='#/signin';location.reload();fetch(API+'logout',{method:'POST',headers:{authorization:'Bearer '+tk}}).catch(()=>{})};else document.getElementById('signInBtn').onclick=()=>location.hash='#/signin';route()}
function route(){const pg=document.getElementById('authPage');if(!pg)return;const h=location.hash;let v=h=='#/signup'?'up':h=='#/signin'?'in':null;
 if(!v&&!token()&&!raw.get('tasync_skip'))v='in';if(token()&&v){history.replaceState(null,'',location.pathname);v=null}
 if(!v){pg.classList.add('hidden');return}pg.classList.remove('hidden');const up=v=='up';
 pg.innerHTML=`<form class="authCard" id="authF"><div class="logo">◆ Trading Assistant</div><h1>${up?'Create your account':'Welcome back'}</h1><p class="muted">${up?'Back up your plans, journal and settings, and sync phone ↔ desktop. Data on this device is merged in.':'Sign in to sync your trading plan across devices.'}</p>
 <input id="aEmail" type="email" placeholder="Email" autocomplete="username" required><input id="aPw" type="password" placeholder="Password${up?' (8+ characters)':''}" autocomplete="${up?'new-password':'current-password'}" minlength="8" required>${up?'<input id="aPw2" type="password" placeholder="Confirm password" autocomplete="new-password" required>':''}
 <button class="pri" type="submit">${up?'Create account':'Sign in'}</button><div id="aMsg" class="neg" style="margin-top:8px"></div>
 <p class="muted" style="text-align:center;margin:16px 0 0">${up?'Already have an account?':"Don't have an account?"}</p><button type="button" class="alt" id="aSwitch">${up?'Sign in instead':'Create account'}</button>
 <button type="button" class="skip" id="aSkip">Continue without account →</button></form>`;
 document.getElementById('aSwitch').onclick=()=>location.hash=up?'#/signin':'#/signup';
 document.getElementById('aSkip').onclick=()=>{raw.set('tasync_skip','1');history.replaceState(null,'',location.pathname);route()};
 document.getElementById('authF').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('aMsg'),pw=document.getElementById('aPw').value;if(up&&pw!==document.getElementById('aPw2').value){m.textContent='Passwords do not match.';return}m.style.color='var(--mu)';m.textContent=up?'Creating account… (a few seconds)':'Signing in… (a few seconds)';
  try{await auth(up?'signup':'login',document.getElementById('aEmail').value,pw)}catch(err){m.style.color='';m.textContent=err.message}};
 setTimeout(()=>document.getElementById('aEmail').focus(),50)}
window.addEventListener('hashchange',route);
function backup(){const d=allLocal();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'trading-assistant',exported:new Date().toISOString(),...d},null,1)],{type:'application/json'}));a.download='trading-assistant-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()}
async function restore(f){try{const j=JSON.parse(await f.text());if(!j.keys)throw 0;const m=tsMap(),now=Date.now();for(const k in j.keys)if(k.startsWith(P)){raw.set(k,j.keys[k]);m[k]=now}raw.set(TS,JSON.stringify(m));if(token())await push(true);alert('Backup restored.');location.reload()}catch{alert('Not a valid Trading Assistant backup file.')}}
window.taSync={push,pull,backup,restore,renderAcct};
window.addEventListener('online',()=>push());
function flush(){if(!token()||!dirty.size)return;try{fetch(API+'state',{method:'PUT',keepalive:true,headers:{'content-type':'application/json',authorization:'Bearer '+token()},body:JSON.stringify(dirtyPayload())}).catch(()=>{})}catch{}}
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
document.addEventListener('DOMContentLoaded',()=>{renderAcct();document.getElementById('bkExport').onclick=backup;document.getElementById('bkImport').onchange=e=>e.target.files[0]&&restore(e.target.files[0]);
 if(token()){if(sessionStorage.getItem('tasync_reloaded')){sessionStorage.removeItem('tasync_reloaded');setStatus('✓ synced')}else pull();setInterval(pull,60000);setInterval(()=>{if(navigator.onLine&&/fail|offline/.test(status))push()},30000)}});
})();
