import {put,list,del} from '@vercel/blob';
import crypto from 'node:crypto';
import {generateText,jsonSchema,tool} from 'ai';
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

 if(path=='chat'){const b=await body(req);const msgs=(b.messages||[]).filter(m=>m&&m.content).map(m=>({role:m.role=='user'?'user':'assistant',content:String(m.content).slice(0,4000)}));
  const older=msgs.length>40?msgs.slice(0,-40):[];const recent=msgs.slice(-40);
  const S=(p,r)=>tool({description:p,inputSchema:jsonSchema({type:'object',properties:r,additionalProperties:false})});
  const D={type:'string',description:'YYYY-MM-DD in Bangkok time'},SE={type:'string',enum:['tokyo','london','ny','custom'],description:'session'},HM={type:'string',description:'HH:MM Bangkok 24h'};
  const tools={
   set_block:S('Add or update a trading session block on a day (creates it if missing). Attach the market/symbols and prep notes collected from the user.',{date:D,session:SE,start:HM,end:HM,title:{type:'string'},symbols:{type:'string',description:'e.g. XAUUSD, NQ, AAPL'},prep_notes:{type:'string',description:'what to prepare: bias, key levels, FVG/OB, news to watch, goal'}}),
   suggest_replies:S('Show 2-5 short quick-reply chips the user can tap to answer your question.',{options:{type:'array',items:{type:'string'},maxItems:5}}),
   move_block:S('Move a session block to a new start time, keeping duration.',{date:D,session:SE,start:HM}),
   delete_block:S('Delete a session block; omit session to clear the whole day (rest day).',{date:D,session:SE}),
   set_goal:S('Set goals of a block (or all blocks of the day if session omitted).',{date:D,session:SE,pnl_target:{type:'number'},max_trades:{type:'number'},process_goal:{type:'string'}}),
   set_risk:S('Change risk settings.',{account_size:{type:'number'},risk_pct:{type:'number'},daily_stop_pct:{type:'number'},max_trades_per_day:{type:'number'}}),
   apply_recommendation:S('Apply the recommended risk settings shown in state.recommendation.',{}),
   prep_tick:S('Tick/untick a pre-session prep step (1 news,2 HTF bias,3 key levels,4 FVG/OB,5 entry trigger,6 trade plan,7 mindset), optionally set note or bias.',{date:D,session:SE,step:{type:'integer',minimum:1,maximum:7},checked:{type:'boolean'},note:{type:'string'},bias:{type:'string',enum:['Bull','Bear','Range']}})};
  const system=`You are Victor's personal day-trading assistant inside his Trading Assistant app. Victor lives in Bangkok (UTC+7), paper trades on TradingView: forex, US stocks, futures/indices, gold, crypto (no crypto on weekends). Reply in the user's language (English or French), concise, practical, warm. Always state money as % and $. Use tools to change the app whenever the user asks for a change; you can call several tools. Never say you didn't understand: if a request is ambiguous, ask one short clarifying question with options. Remember and refer back to earlier conversation.
SCHEDULING FLOW: when Victor asks to schedule/plan a session but details are missing, do NOT create it yet. Ask natural follow-ups one or two at a time (with suggest_replies chips): 1) which market/symbol(s) (e.g. Gold XAUUSD, NQ, EURUSD, a stock), 2) day + time or session (offer the matching sessions with Bangkok times from state), 3) what to prepare (HTF bias, 1H key levels, 15m FVG/order blocks, news to watch from state, P&L goal). Once you have market + time (prep can default to the standard routine if he says 'default'/'skip'), call set_block with symbols and prep_notes, plus set_goal if he gave a target, then confirm briefly with the session time, symbols, prep checklist and any high-impact news inside it. When the request is already complete, act immediately without extra questions. Whenever you ask a question, END your message with a final line exactly like: CHIPS: option 1 | option 2 | option 3 (2-5 short tappable answers). When calling set_goal for a block you just scheduled, always pass its session. Don't list options as a long bullet list if they are in CHIPS; keep messages short and natural. Times are Bangkok time. Session keys: tokyo, london, ny (US cash open/overlap), custom.\nCURRENT APP STATE (JSON):\n${JSON.stringify(b.state||{}).slice(0,12000)}`+(older.length?`\nEARLIER CONVERSATION (condensed): `+older.map(m=>(m.role=='user'?'U: ':'A: ')+m.content.slice(0,160).replace(/\s+/g,' ')).join(' | ').slice(0,6000):'');
  const r=await generateText({model:process.env.AI_MODEL||'openai/gpt-4.1-mini',system,messages:recent.length?recent:[{role:'user',content:'hi'}],tools,maxOutputTokens:700});
  let txt=r.text||'',cm=txt.match(/\n?\s*CHIPS:\s*(.+)\s*$/i),chips2=[];if(cm){chips2=cm[1].split('|').map(x=>x.trim().replace(/^[*_`]+|[*_`]+$/g,'')).filter(Boolean).slice(0,5);txt=txt.slice(0,cm.index).trim()}
  return J(200,{text:txt,actions:(r.toolCalls||[]).filter(c=>c.toolName!='suggest_replies').map(c=>({name:c.toolName,args:c.input})),chips:((r.toolCalls||[]).find(c=>c.toolName=='suggest_replies')?.input?.options||[]).slice(0,5).concat(chips2).slice(0,5)})}
 if(path=='logout'){const a=req.headers.authorization.replace(/^Bearer /,'');const b=await latest('tokens/'+h(a)+'.json');if(b)await del(b.map(x=>x.url),{token:TOK});return J(200,{ok:true})}
 if(path=='state'){const cur=await getOne('state/'+uid+'/');let st=cur?.data||{keys:{},ts:{}};
  if(req.method=='GET')return J(200,st);
  const P=v=>{try{return JSON.parse(v)||[]}catch{return[]}};const b=await body(req);let changed=0;const origC=st.keys.ta_chat,origT=st.keys.ta_trades,origD=st.keys.ta_tradesDel;for(const k in (b.keys||{})){const t=+(b.ts||{})[k]||0;if(!(k in st.keys)||t>(st.ts[k]||0)){st.keys[k]=b.keys[k];st.ts[k]=t;changed++}}
  if(b.keys&&(b.keys.ta_trades||b.keys.ta_tradesDel)){const del=new Set([...P(origD),...P(b.keys.ta_tradesDel)].map(String));const all=[...P(origT),...P(b.keys.ta_trades)],seen=new Set(),u=[];for(const t of all){const id=String(t.id);if(!seen.has(id)&&!del.has(id)){seen.add(id);u.push(t)}}u.sort((x,y)=>x.t-y.t);const nt=JSON.stringify(u),nd=JSON.stringify([...del]);const now=Date.now();if(nt!==origT||st.keys.ta_trades!==nt){st.keys.ta_trades=nt;st.ts.ta_trades=now;changed++}if(nd!==(origD||'[]')||st.keys.ta_tradesDel!==nd){st.keys.ta_tradesDel=nd;st.ts.ta_tradesDel=now;changed++}}
  if(b.keys&&b.keys.ta_chat){const all=[...P(origC),...P(b.keys.ta_chat)],seen=new Set(),u=[];for(const m of all){const id=m.id||(m.r+m.text+(m.t||''));if(!seen.has(id)){seen.add(id);u.push(m)}}u.sort((x,y)=>(x.t||0)-(y.t||0));const nc=JSON.stringify(u);if(st.keys.ta_chat!==nc){st.keys.ta_chat=nc;st.ts.ta_chat=Date.now();changed++}}
  if(changed){st.updated=Date.now();await save(`state/${uid}/${String(Date.now()).padStart(15,'0')}.json`,st);if(cur&&cur.blobs.length>2)await del(cur.blobs.slice(2).map(x=>x.url),{token:TOK})}
  return J(200,st)}
 return J(404,{error:'Not found'})}catch(e){console.error(e);return J(500,{error:'Server error'})}}
