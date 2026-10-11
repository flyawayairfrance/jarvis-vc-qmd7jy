import {put,list,del} from '@vercel/blob';
import crypto from 'node:crypto';
const TOK=process.env.BLOB_READ_WRITE_TOKEN;
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const scrypt=(pw,salt)=>new Promise((ok,no)=>crypto.scrypt(pw,salt,64,{N:16384,r:8,p:1},(e,k)=>e?no(e):ok(k.toString('hex'))));
async function latest(prefix){const {blobs}=await list({prefix,token:TOK});if(!blobs.length)return null;blobs.sort((a,b)=>b.pathname.localeCompare(a.pathname));return blobs}
async function readJSON(url){const r=await fetch(url,{headers:{authorization:'Bearer '+TOK},cache:'no-store'});return r.ok?r.json():null}
async function getOne(prefix){const b=await latest(prefix);return b?{data:await readJSON(b[0].url),blobs:b}:null}
const save=(path,obj)=>put(path,JSON.stringify(obj),{access:'private',token:TOK,addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
async function auth(req){const a=(req.headers.authorization||'').replace(/^Bearer /,'');if(a.length<20)return null;const t=await getOne('tokens/'+h(a)+'.json');return t?.data?.uid||null}
function body(req){return new Promise(ok=>{if(req.body&&typeof req.body=='object')return ok(req.body);if(typeof req.body=='string'){try{return ok(JSON.parse(req.body))}catch{return ok({})}}let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch{ok({})}})})}
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type,authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method=='OPTIONS')return res.status(204).end();
 const path=(req.url||'').split('?')[0].replace(/^\/api\/?/,'');const J=(c,o)=>res.status(c).json(o);
 try{
 if(path=='health')return J(200,{ok:true});
 if(path=='signup'||path=='login'){const b=await body(req);const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||'');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||pw.length<8)return J(400,{error:'Valid email and password (8+ chars) required'});
  const uid=h('u:'+email),u=await getOne('users/'+uid+'.json');
  if(path=='signup'){if(u)return J(409,{error:'Account already exists – sign in instead'});const salt=crypto.randomBytes(16).toString('hex');await save('users/'+uid+'.json',{email,salt,hash:await scrypt(pw,salt),created:Date.now()})}
  else{if(!u||!u.data)return J(401,{error:'Wrong email or password'});const k=await scrypt(pw,u.data.salt);if(!crypto.timingSafeEqual(Buffer.from(k,'hex'),Buffer.from(u.data.hash,'hex')))return J(401,{error:'Wrong email or password'})}
  const token=crypto.randomBytes(32).toString('hex');await save('tokens/'+h(token)+'.json',{uid,created:Date.now()});return J(200,{token,email})}
 const uid=await auth(req);if(!uid)return J(401,{error:'Not signed in'});
 if(path=='logout'){const a=req.headers.authorization.replace(/^Bearer /,'');const b=await latest('tokens/'+h(a)+'.json');if(b)await del(b.map(x=>x.url),{token:TOK});return J(200,{ok:true})}
 if(path=='state'){const cur=await getOne('state/'+uid+'/');let st=cur?.data||{keys:{},ts:{}};
  if(req.method=='GET')return J(200,st);
  const P=v=>{try{return JSON.parse(v)||[]}catch{return[]}};const b=await body(req);let changed=0;const origC=st.keys.ta_chat,origT=st.keys.ta_trades,origD=st.keys.ta_tradesDel;for(const k in (b.keys||{})){const t=+(b.ts||{})[k]||0;if(!(k in st.keys)||t>(st.ts[k]||0)){st.keys[k]=b.keys[k];st.ts[k]=t;changed++}}
  if(b.keys&&(b.keys.ta_trades||b.keys.ta_tradesDel)){const del=new Set([...P(origD),...P(b.keys.ta_tradesDel)].map(String));const all=[...P(origT),...P(b.keys.ta_trades)],seen=new Set(),u=[];for(const t of all){const id=String(t.id);if(!seen.has(id)&&!del.has(id)){seen.add(id);u.push(t)}}u.sort((x,y)=>x.t-y.t);const nt=JSON.stringify(u),nd=JSON.stringify([...del]);const now=Date.now();if(nt!==origT||st.keys.ta_trades!==nt){st.keys.ta_trades=nt;st.ts.ta_trades=now;changed++}if(nd!==(origD||'[]')||st.keys.ta_tradesDel!==nd){st.keys.ta_tradesDel=nd;st.ts.ta_tradesDel=now;changed++}}
  if(b.keys&&b.keys.ta_chat){const all=[...P(origC),...P(b.keys.ta_chat)],seen=new Set(),u=[];for(const m of all){const id=m.id||(m.r+m.text+(m.t||''));if(!seen.has(id)){seen.add(id);u.push(m)}}u.sort((x,y)=>(x.t||0)-(y.t||0));const nc=JSON.stringify(u);if(st.keys.ta_chat!==nc){st.keys.ta_chat=nc;st.ts.ta_chat=Date.now();changed++}}
  if(changed){st.updated=Date.now();await save(`state/${uid}/${String(Date.now()).padStart(15,'0')}.json`,st);if(cur&&cur.blobs.length>2)await del(cur.blobs.slice(2).map(x=>x.url),{token:TOK})}
  return J(200,st)}
 return J(404,{error:'Not found'})}catch(e){console.error(e);return J(500,{error:'Server error'})}}
