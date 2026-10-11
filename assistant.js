'use strict';
(()=>{const $=s=>document.querySelector(s);let chat=LS.g('chat',[]),pending=LS.g('chatPending',null),undo=[];
const SES={tokyo:{re:/\b(tokyo|asia|asie|asian)\b/,n:'Tokyo',k:'tokyo'},london:{re:/\b(london|londres|lon|europe)\b/,n:'London',k:'london'},cash:{re:/\b(ny|nyc|new york|us|cash|wall street|nasdaq|overlap)\b/,n:'New York',k:'cash'}};
const DAYS=[['sunday','dimanche'],['monday','lundi'],['tuesday','mardi'],['wednesday','mercredi'],['thursday','jeudi'],['friday','vendredi'],['saturday','samedi']];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const today=()=>bkDate(new Date()),dname=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});
function getDate(t){if(/\b(day after tomorrow|apres demain|apres-demain)\b/.test(t))return addDays(today(),2);if(/\b(tomorrow|demain|tmrw)\b/.test(t))return addDays(today(),1);if(/\b(today|aujourd hui|tonight|ce soir|now)\b/.test(t))return today();
 const ev=t.match(/\b(cpi|nfp|fomc|ppi|gdp|pib|retail sales|payrolls?|powell|jobless|ism|pce)\b/);if(ev&&/\b(day|jour|on|le)\b/.test(t)){const k={nfp:'non-farm',payroll:'non-farm',payrolls:'non-farm',pib:'gdp',powell:'powell'}[ev[1]]||ev[1];const e=allEvents().find(e=>e.t>Date.now()-864e5&&norm(e.title).includes(k));return e?bkDate(new Date(e.t)):{missing:ev[1].toUpperCase()}}
 for(let i=0;i<7;i++)if(DAYS[i].some(w=>new RegExp('\\b'+w+'\\b').test(t))){const w0=new Date(today()+'T12:00:00Z').getUTCDay();let n=(i-w0+7)%7;if(/\bnext\b|\bprochain\b/.test(t)&&n==0)n=7;return addDays(today(),n)}
 const m=t.match(/\b(\d{4}-\d{2}-\d{2})\b/);return m?m[1]:null}
function hm(h,mi,ap){h=+h;mi=+(mi||0);if(ap=='pm'&&h<12)h+=12;if(ap=='am'&&h==12)h=0;return h>24||mi>59?null:h*60+mi}
function getTimes(t){const T='(\\d{1,2})(?:[:h.](\\d{2})|h)?\\s*(am|pm)?';let m=t.match(new RegExp('(?:from |de )?'+T+'\\s*(?:-|to|a|until|jusqu a|–)\\s*'+T));
 if(m){let a=hm(m[1],m[2],m[3]||(m[6]=='pm'&&+m[1]<12&&+m[1]<+m[4]?'pm':null)),b=hm(m[4],m[5],m[6]);if(a!=null&&b!=null){if(b<=a)b+=0;return{s:a,e:b}}}
 m=t.match(new RegExp('(?:at|to|a|@|vers|for)\\s+'+T+'(?!\\s*(?:%|\\$|trades?|hours?|h\\b|heures?|min))'))||t.match(/\b(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm)\b/)||t.match(/\b(\d{1,2})h(\d{2})?\b/)||t.match(/\b(\d{1,2}):(\d{2})\b/);
 if(m){const a=hm(m[1],m[2],m[3]);if(a!=null)return{s:a}}return null}
function getSes(t){for(const k in SES)if(SES[k].re.test(t))return SES[k];return null}
function dur(t){const m=t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|heures?)/);if(m)return Math.round(+m[1]*60);const n=t.match(/(\d+)\s*(min|minutes)/);return n?+n[1]:null}
function snap(){undo.push(JSON.stringify({plans,S,prefs}));if(undo.length>20)undo.shift()}
function commit(){save();LS.s('settings',S);LS.s('prefs',prefs);renderPlan();renderJournal()}
function dayPlan(d){if(!plans[d])plans[d]=propose(d);return plans[d]}
function findBlk(d,ses){return dayPlan(d).filter(b=>b.key==ses.k||norm(b.title).match(ses.re))}
function proposeBlock(d,ses){const p=propose(d).find(b=>b.key==ses.k);if(p)return p;const ss=sessions(d).find(x=>x.k==(ses.k=='cash'?'cash':ses.k));const s=ses.k=='cash'?ss.s-30:ss.s;return{id:Date.now(),key:ses.k,title:ses.n+' session',s,e:s+120,goal:goal(ses.k!='tokyo'),review:''}}
const blkTxt=b=>`${fmtM(b.s)}–${fmtM(b.e)} ${b.title}`;
function say(text,chips){chat.push({r:'a',text,chips:chips||[]});draw()}
function draw(){chat=chat.slice(-150);LS.s('chat',chat);LS.s('chatPending',pending);$('#msgs').innerHTML=chat.map(m=>`<div class="m ${m.r}">${esc(m.text)}</div>`).join('');$('#msgs').scrollTop=1e9;
 const last=chat[chat.length-1];const ch=(last&&last.r=='a'&&last.chips.length?last.chips:["Today's plan",'Upcoming news','Recommend risk','Help']);$('#chips').innerHTML=ch.map(c=>`<button type="button">${esc(c)}</button>`).join('')}
const HELP='I can:\n• trade London tomorrow 14-16 / ajoute Londres demain 14h-16h\n• move Tokyo to 8am / déplace NY à 21h\n• make London 3 hours / extend NY to 23:30\n• skip Friday / pas de trading vendredi\n• no NY on CPI day / delete Tokyo today\n• target $200 London / max 3 trades / goal: wait for retest\n• risk 0.5% / daily stop 2% / account 5000\n• recommend risk / apply\n• today\'s plan / news / undo';
function summary(d){const b=dayPlan(d),ev=dayEvents(d);let s=`📅 ${dname(d)} (Bangkok)\n`;s+=b.length?b.map(x=>`• ${blkTxt(x)} — target ${money(x.goal.pnl)}, max ${x.goal.trades} trades${x.note?'\n  '+x.note:''}`).join('\n'):'• No sessions planned.';s+=ev.length?'\n⚠ High-impact: '+ev.map(e=>fmtM(e.m)+' '+(e.country||'')+' '+e.title).join(', '):'\nNo high-impact news.';s+=`\nRisk: ${S.risk}% = ${money(S.acct*S.risk/100)}/trade · daily stop ${S.stop}% = ${money(S.acct*S.stop/100)}`;return s}
function news(){const l=allEvents().filter(e=>e.impact=='High'&&e.t>Date.now()).slice(0,8);return l.length?'Upcoming high-impact news (Bangkok):\n'+l.map(e=>`• ${new Date(e.t).toLocaleString('en-GB',{timeZone:TZ,weekday:'short',hour:'2-digit',minute:'2-digit'})} ${e.country||''} ${e.title}${nearSession(e.t)?' ⚠ in your session':''}`).join('\n'):'No upcoming high-impact events loaded (check the News tab).'}
function recMsg(){const x=recommend(S.acct);pending={type:'applyRec',x};return `For ${money(S.acct)} I recommend:\n• Risk per trade ${x.r}% = ${money(x.usd)}\n• Daily stop ${x.d}% = ${money(x.dusd)}\n• Max ${x.m} trades/day\n• Session target: prime ${money(x.usd*1.5)}, other ${money(x.usd)}\nWhy: ${x.why}\nApply it?`}
function applyRec(x){snap();S.risk=x.r;S.stop=x.d;S.max=x.m;commit();pending=null;return `✅ Applied: ${x.r}% (${money(x.usd)}) per trade, daily stop ${x.d}% (${money(x.dusd)}), max ${x.m} trades.`}
function handle(raw){const t=norm(raw);let d=getDate(t);
 if(d&&d.missing){say(`I don't see ${d.missing} in this week's calendar. Which day is it?`,DAYS.slice(1,6).map(x=>x[0][0].toUpperCase()+x[0].slice(1)));pending={type:'redo',text:raw.replace(new RegExp(d.missing+' day','i'),'').replace(/\bon\b\s*$/,'')};return}
 // pending answers
 if(pending){const p=pending;
  if(p.type=='acct'){const n=num(t.replace(/k\b/,'000'));if(n>0){S.acct=n*(/\d\s*k\b/.test(t)?1:1);LS.s('acctSet',1);LS.s('settings',S);renderRisk();say(`Account set to ${money(S.acct)}.\n`+recMsg(),['Yes, apply','No thanks']);return}}
  if(p.type=='applyRec'){if(/^(y|yes|ok|oui|sure|apply|go|do it|yep|d accord|vas-y)\b/.test(t)){say(applyRec(p.x),['Undo',"Today's plan"]);return}if(/^(no|non|nope|later)\b/.test(t)){pending=null;say('OK, settings unchanged. You can tweak them any time in the Risk tab.');return}}
  if(p.type=='ses'){const ses=getSes(t);if(ses){pending=null;handle(p.text+' '+ses.n);return}}
  if(p.type=='redo'&&d){pending=null;handle(p.text+' '+d);return}
  if(p.type=='time'){const tm=getTimes(t);if(tm){pending=null;handle(p.text+' '+fmtM(tm.s)+(tm.e?'-'+fmtM(tm.e):''));return}}
  pending=null}
 if(/^(undo|annule|annuler|cancel that|revert|defaire)\b/.test(t)){if(!undo.length){say('Nothing to undo.');return}const o=JSON.parse(undo.pop());Object.keys(plans).forEach(k=>delete plans[k]);Object.assign(plans,o.plans);Object.assign(S,o.S);Object.keys(prefs).forEach(k=>delete prefs[k]);Object.assign(prefs,o.prefs);commit();say('↩ Undone.');return}
 if(/^(help|aide|\?|what can you do|commands)/.test(t)){say(HELP);return}
 if(/\b(news|nouvelles|events?|evenements|calendar|calendrier|annonces?)\b/.test(t)&&!/\bno\b|\bpas\b/.test(t)){say(news());return}
 if(/\b(plan|summary|summarize|resume|programme|agenda|schedule)\b/.test(t)&&!getTimes(t)&&!/\b(move|add|skip|delete)\b/.test(t)){say(summary(d||today()));return}
 if(/\b(recommend|recommande|suggest|conseil)\b/.test(t)){say(recMsg(),['Yes, apply','No thanks']);return}
 // risk settings
 let m,ch=[];const pct=re=>{const x=t.match(re);return x?+x[1].replace(',','.'):null};
 const acct=t.match(/\b(?:account|capital|balance|compte|solde)\D{0,12}\$?\s*(\d[\d,.]*)\s*(k)?/);if(acct){snap();S.acct=num(acct[1])*(acct[2]?1000:1);LS.s('acctSet',1);ch.push(`account ${money(S.acct)}`)}
 const ds=pct(/(?:daily stop|daily loss|stop journalier|perte max|max loss)\D{0,8}(\d+(?:[.,]\d+)?)\s*%/);if(ds!=null){if(!ch.length)snap();S.stop=ds;ch.push(`daily stop ${ds}% = ${money(S.acct*ds/100)}`)}
 const rk=pct(/\brisk(?:que)?(?: per trade| par trade)?\D{0,6}(\d+(?:[.,]\d+)?)\s*%/);if(rk!=null){if(!ch.length)snap();S.risk=rk;ch.push(`risk ${rk}% = ${money(S.acct*rk/100)}/trade`)}
 const ses0=getSes(t);
 if((m=t.match(/max(?:imum)?\s*(\d+)\s*trades?|(\d+)\s*trades? max/))&&!ses0&&!/target|goal|objectif/.test(t)&&!d){if(!ch.length)snap();S.max=+(m[1]||m[2]);ch.push(`max ${S.max} trades/day`)}
 if(ch.length){commit();say('✅ Updated: '+ch.join(', ')+(acct?'\n'+recMsg():''),acct?['Yes, apply','No thanks']:['Undo']);return}
 // goals
 if(/\b(target|goal|objectif|cible|max \d+ trades?|process)\b/.test(t)){const D=d||today(),bl=ses0?findBlk(D,ses0):dayPlan(D);if(!bl.length){say(`No ${ses0?ses0.n+' ':''}block on ${dname(D)} to set a goal on.`);return}snap();const c=[];
  const tg=t.match(/(?:target|objectif|cible)\D{0,6}\$?\s*(\d+(?:\.\d+)?)/);const mt=t.match(/max\s*(\d+)\s*trades?/);const pg=raw.match(/(?:process goal|process|goal|objectif)\s*[:=]\s*(.+)$/i);
  bl.forEach(b=>{if(tg)b.goal.pnl=+tg[1];if(mt)b.goal.trades=+mt[1];if(pg)b.goal.process=pg[1].trim()});if(tg)c.push(`target ${money(+tg[1])}`);if(mt)c.push(`max ${mt[1]} trades`);if(pg)c.push(`process: “${pg[1].trim()}”`);
  if(!c.length){undo.pop();say('What goal? e.g. “target $150 London”, “max 2 trades”, or “goal: only A+ setups”.');return}commit();say(`✅ ${dname(D)} ${bl.map(b=>b.title.split(' –')[0]).join(', ')}: ${c.join(', ')}`,['Undo',"Today's plan"]);return}
 const tm=getTimes(t),D=d||today(),isDel=/\b(skip|delete|remove|cancel|no|drop|supprime|supprimer|enleve|annule|pas de|sans|off|rest|repos|clear)\b/.test(t);
 // whole-day skip
 if(isDel&&!ses0&&!tm){if(!d){say('Which day should I clear?',['Today','Tomorrow','Friday']);pending={type:'redo',text:raw};return}snap();const n=dayPlan(D).length;plans[D]=[];commit();say(`✅ Cleared ${dname(D)} (${n} block${n==1?'':'s'} removed). Rest day.`,['Undo']);return}
 if(isDel&&ses0){const bl=findBlk(D,ses0);if(!bl.length){say(`There's no ${ses0.n} block on ${dname(D)}.`);return}snap();plans[D]=dayPlan(D).filter(b=>!bl.includes(b));commit();say(`✅ Removed ${bl.map(blkTxt).join(', ')} on ${dname(D)}.`,['Undo',"Today's plan"]);return}
 const isMove=/\b(move|shift|push|pull|deplace|decale|reschedule|change)\b/.test(t),isSize=/\b(extend|shorten|resize|make|longer|shorter|allonge|raccourci|prolonge|until|jusqu)\b/.test(t)||dur(t),isAdd=/\b(trade|add|schedule|plan|book|ajoute|planifie|session|block|trader)\b/.test(t)||(ses0&&tm);
 if(!(isMove||isSize||isAdd)){say("Sorry, I didn't get that. Try one of these:",["Today's plan",'trade London tomorrow 14-16','move Tokyo to 8am','skip Friday','Help']);return}
 if(!ses0&&!tm){say('Which session?',['Tokyo','London','New York']);pending={type:'ses',text:raw};return}
 let bl=ses0?findBlk(D,ses0):[];
 if(isMove&&!tm){say(`What time should ${ses0.n} start on ${dname(D)}?`,['8am','14:00','20:30']);pending={type:'time',text:raw};return}
 snap();let b=bl[0],verb;
 if(!b){b=ses0?proposeBlock(D,ses0):{id:Date.now(),title:'Custom session',s:tm.s,e:tm.s+90,goal:goal(false),review:''};dayPlan(D).push(b);verb='Added'}else verb=isMove?'Moved':'Updated';
 const len=b.e-b.s;if(tm){b.s=tm.s;b.e=tm.e!=null?tm.e:(isSize&&!dur(t)?b.e:tm.s+len)}const dd=dur(t);if(dd)b.e=b.s+dd;
 const um=t.match(/(?:until|to|jusqu a)\s+(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm)?\s*$/);if(isSize&&um&&!isMove&&!(tm&&tm.e!=null)){b.s=bl[0]?b.s:b.s;const e=hm(um[1],um[2],um[3]);if(e!=null&&e>b.s)b.e=e;else if(tm&&bl[0]){}}
 if(b.e<=b.s)b.e=b.s+60;b.e=Math.min(b.e,1440);dayPlan(D).sort((a,c)=>a.s-c.s);if(b.key&&D==today())learnFor(b,D);commit();
 const ev=dayEvents(D).filter(e=>e.m>=b.s-30&&e.m<=b.e);say(`✅ ${verb} ${blkTxt(b)} on ${dname(D)}.${ev.length?'\n⚠ High-impact inside: '+ev.map(e=>fmtM(e.m)+' '+e.title).join(', '):''}`,['Undo',"Today's plan"])}
function learnFor(b,D){const od=day;day=D;learn(b);day=od}
function send(text){if(!text.trim())return;chat.push({r:'u',text,chips:[]});try{handle(text)}catch(e){console.warn(e);say("Something went wrong parsing that. Try rephrasing, or type 'help'.")}draw()}
$('#chatF').onsubmit=e=>{e.preventDefault();send($('#chatIn').value);$('#chatIn').value=''};
$('#chips').onclick=e=>{if(e.target.tagName=='BUTTON')send(e.target.textContent)};
function opened(){if(!LS.g('acctSet',0)&&!chat.some(m=>m.r=='a')){pending={type:'acct'};say("Hi Victor 👋 I'm your trading assistant. What's your (paper) account size in $?",['$1000','$5000','$10000','$25000'])}else if(!chat.length)say("Hi Victor 👋 Ask me anything about your plan. Type 'help' for examples.");draw()}
document.querySelector('[data-t=chat]').addEventListener('click',opened);draw();
window.taSend=send;})();
