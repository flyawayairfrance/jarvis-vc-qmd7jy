/* 40-command obedience suite (EN/FR/typos). Runs the real app in Chrome with the AI API blocked, so it measures what executes client-side.
   usage: node test/commands.e2e.js http://localhost:8765/index.html */
const pw=require('playwright-core');const U=process.argv[2];
const bk=a=>new Date(Date.now()+a*864e5).toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'});const T0=bk(0),T1=bk(1);
const G=k=>`(()=>{try{return JSON.parse(localStorage.getItem('ta_${k}'))}catch{return null}})()`;
const tab=`document.querySelector('#tabs .on')?.dataset.t`,run=`/Stop/.test(document.getElementById('lvGo')?.textContent||'')`,tf=`document.querySelector('#lvTf .on')?.dataset.tf`,sy=`document.getElementById('lvSym')?.value`;
const startLive=`(window.JarvisLive&&JarvisLive.start('XAU','5m'),1)`;
const C=[
 ['start live session',`${tab}=='live'&&${run}`],['start a live trade session',`${tab}=='live'&&${run}`],['lance la session live',`${tab}=='live'&&${run}`],['strat live sesion',`${tab}=='live'&&${run}`],
 ['trade with me on bitcoin',`${run}&&${sy}=='BTCUSDT'`],['stop the live session',`!${run}`,startLive],['arrête la session live',`!${run}`,startLive],
 ['go to journal',`${tab}=='journal'`],['open the news tab',`${tab}=='news'`],["ouvre l'académie",`${tab}=='academy'`],['show me the risk tab',`${tab}=='risk'`],['opne journal',`${tab}=='journal'`],['open market',`${tab}=='market'`],
 ['switch to 15m',`${tf}=='15m'`,startLive],['change timeframe to 1 minute',`${tf}=='1m'`,startLive],['passe en 5 min',`${tf}=='5m'`,`(window.JarvisLive&&JarvisLive.start('XAU','15m'),1)`],['swich to 15 min',`${tf}=='15m'`,startLive],
 ['switch symbol to gold',`${sy}=='XAU'`,`(window.JarvisLive&&JarvisLive.start('NQ','5m'),1)`],['watch nasdaq live',`${sy}=='NQ'`,startLive],
 ['set risk to 1%',`${G('settings')}?.risk==1`],['risk 0.5 percent per trade',`${G('settings')}?.risk==0.5`],['mon capital est 25000',`${G('settings')}?.acct==25000`],['account size 15k',`${G('settings')}?.acct==15000`],['daily stop 3%',`${G('settings')}?.stop==3`],['max 4 trades per day',`${G('settings')}?.max==4`],
 ['turn on notifications',`window.__n.on>0||!!document.querySelector('.nt-chatcta')`],['désactive les notifications',`window.__n.off>0`],['send a test notification',`window.__n.test>0`],['turn off sweep alerts',`${G('notifyPrefs')}?.sweeps===false`],['enable scanner alerts',`${G('notifyPrefs')}?.scanner===true`],
 ['add a london session tomorrow',`(${G('plans')}?.['${T1}']||[]).some(b=>/london/i.test(b.title))`],['add ny session today 20:30 to 22:00 on NQ',`(${G('plans')}?.['${T0}']||[]).some(b=>b.s==1230)`],
 ["delete tomorrow's london session",`!(${G('plans')}?.['${T1}']||[]).some(b=>/london/i.test(b.title))`,`(window.taSend('add a london session tomorrow'),1)`],['rest day today',`!(${G('plans')}?.['${T0}']||[]).length`],
 ['open the FVG lesson',`${tab}=='academy'`],['teach me order blocks',`${tab}=='academy'`],['hide the chart',`document.getElementById('lvGrid')?.classList.contains('nochart')`,startLive],['show tradingview',`!document.getElementById('lvTvBox')?.classList.contains('hidden')`,startLive],
 ['from now on always risk 1%',`(${G('orders')}||[]).some(x=>/risk 1%/.test(x))&&${G('settings')}?.risk==1`],['position size entry 4200 stop 4195',`document.getElementById('pEntry')?.value=='4200'`]];
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});let ok=0;const fails=[];
 for(const [cmd,check,pre] of C){const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.route(/vercel\.app\/api\//,r=>r.abort());
  await ctx.addInitScript(()=>{localStorage.setItem('tasync_token','x'.repeat(64));localStorage.setItem('ta_settings',JSON.stringify({acct:10000,risk:2,stop:5,max:3}));localStorage.setItem('ta_follow','false');window.__n={on:0,off:0,test:0};
   const hook=()=>{const N=window.JarvisNotify;if(!N||N.__h)return;N.__h=1;['enable','enableClick'].forEach(k=>{const o=N[k];N[k]=(...a)=>{__n.on++;try{return o&&o(...a)}catch{}}});const d=N.disable;N.disable=(...a)=>{__n.off++;try{return d(...a)}catch{}};const t=N.test;N.test=(...a)=>{__n.test++;return Promise.resolve({})}};
   setInterval(hook,100);const rp=window.Notification&&Notification.requestPermission;if(rp)Notification.requestPermission=()=>{__n.on++;return Promise.resolve('default')}});
  const p=await ctx.newPage();await p.goto(U);await p.waitForTimeout(3000);await p.evaluate(()=>document.getElementById('authPage')?.classList.add('hidden'));
  if(pre){await p.evaluate(pre);await p.waitForTimeout(2500)}await p.evaluate(()=>window.JARVIS_NAV&&JARVIS_NAV('chat'));
  await p.evaluate(c=>window.taSend(c),cmd);await p.waitForTimeout(2500);let pass=false;try{pass=!!(await p.evaluate(check))}catch(e){}
  if(pass)ok++;else fails.push(cmd);await ctx.close()}
 console.log(`SCORE ${ok}/${C.length} = ${Math.round(ok/C.length*100)}%`);console.log('FAILED:',JSON.stringify(fails));await b.close()})()
