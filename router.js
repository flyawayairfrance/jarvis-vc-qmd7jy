/* DAVOS intent router: deterministic, runs CLIENT-SIDE before any AI call, so common commands work instantly (even if the API is down).
   route(text,{now}) -> {intent, actions:[{name,args}], reply} | null. Pure function – unit-tested in test/router.test.js. */
(function(root){
const VOC=['trade','with','start','stop','live','session','switch','change','open','show','hide','journal','news','academy','risk','market','plan','prep','chat','notifications','notification','test','timeframe','minute','minutes','symbol','chart','tradingview','enable','disable','account','capital','daily','trades','lesson','teach','watchlist','follow','tomorrow','today','london','tokyo','delete','remove','cancel','scanner','sweeps','sweep','briefing','position','entry','alerts','launch','trading','nasdaq','bitcoin','ethereum','turn','send','clear','percent','always','explain','order','orders'];
const FR={lance:'start',lancer:'start',demarre:'start',demarrer:'start',commence:'start',arrete:'stop',arreter:'stop',stoppe:'stop',termine:'stop',ouvre:'open',ouvrir:'open',affiche:'show',montre:'show',va:'go',aller:'go',seance:'session',active:'enable',activer:'enable',desactive:'disable',desactiver:'disable',coupe:'disable',cache:'hide',masque:'hide',passe:'switch',mets:'set',met:'set',supprime:'delete',supprimer:'delete',annule:'cancel',ajoute:'add',ajouter:'add',demain:'tomorrow',aujourd:'today',hui:'',aujourdhui:'today',journal:'journal',actualites:'news',nouvelles:'news',academie:'academy',risque:'risk',marche:'market',capital:'capital',essai:'test',envoie:'send',apprends:'teach',explique:'explain',lecon:'lesson',graphique:'chart',bougies:'chart',minute:'minute',minutes:'minutes',or:'gold',euro:'eurusd',pourcent:'percent',jour:'day',par:'per',maximum:'max',suivi:'follow',ecoute:'',notif:'notifications',notifs:'notifications',alertes:'alerts',alerte:'alerts'};
const lev=(a,b)=>{const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1),i>1&&j>1&&a[i-1]==b[j-2]&&a[i-2]==b[j-1]?d[i-2][j-2]+1:99);return d[m][n]};
function norm(t){let s=String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'`]/g,' ').replace(/[!?;,]+/g,' ').replace(/\.(?!\d)/g,' ').replace(/\s+/g,' ').trim();
 return s.split(' ').map(w=>{if(FR[w]!=null)return FR[w];if(w.length<4||VOC.includes(w)||/\d/.test(w))return w;let b=null,bd=9;for(const v of VOC){const d=lev(w,v);if(d<bd){bd=d;b=v}}return bd<=(w.length>=7?2:1)?b:w}).filter(Boolean).join(' ')}
const SYM=[[/\b(gold|xau|xauusd|paxg)\b/,'XAU'],[/\b(gc|gold futures?)\b/,'GOLD'],[/\b(nasdaq|nq|nas100|us100|mnq)\b/,'NQ'],[/\b(es|s ?& ?p|sp500|spx|us500|mes)\b/,'ES'],[/\b(eurusd|eur usd|eur)\b/,'EURUSD'],[/\b(gbpusd|cable|gbp)\b/,'GBPUSD'],[/\b(usdjpy|yen|jpy)\b/,'USDJPY'],[/\b(audusd|aud)\b/,'AUDUSD'],[/\b(dax|ger40|de40)\b/,'DAX'],[/\b(btc|bitcoin|btcusdt)\b/,'BTCUSDT'],[/\b(eth|ethereum|ethusdt)\b/,'ETHUSDT'],[/\b(sol|solana)\b/,'SOLUSDT'],[/\b(aapl|apple)\b/,'AAPL'],[/\b(nvda|nvidia)\b/,'NVDA'],[/\b(tsla|tesla)\b/,'TSLA']];
const sym=s=>{for(const [r,k] of SYM)if(r.test(s))return k;return null};
const TABS={plan:'plan',calendar:'plan',calendrier:'plan',live:'live',chat:'chat',assistant:'chat',prep:'prep',preparation:'prep',market:'market',chart:'market',news:'news',journal:'journal',risk:'risk',settings:'risk',parametres:'risk',reglages:'risk',academy:'academy',lessons:'academy',lesson:'academy'};
const TFR=s=>{const m=s.match(/\b(1|5|15|one|five|fifteen|un|cinq|quinze)\s*(m|mn|min|minute|minutes)\b/)||s.match(/\bm(1|5|15)\b/);if(!m)return null;const v={one:'1',un:'1',five:'5',cinq:'5',fifteen:'15',quinze:'15'}[m[1]]||m[1];return v+'m'};
const num=x=>{if(x==null)return null;let v=parseFloat(String(x).replace(/,/g,'.').replace(/\s/g,''));if(/k$/i.test(x))v*=1000;return isNaN(v)?null:v};
const bkDate=(now,add=0)=>new Date(now+add*864e5).toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'});
const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],DFR=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
function dateOf(s,now){if(/\btomorrow\b/.test(s))return bkDate(now,1);if(/\btoday\b|\btonight\b|\bce soir\b/.test(s))return bkDate(now);const wd=new Date(new Date(now).toLocaleString('en-US',{timeZone:'Asia/Bangkok'})).getDay();for(let i=0;i<7;i++)if(new RegExp('\\b('+DAYS[i]+'|'+DFR[i]+')\\b').test(s))return bkDate(now,((i-wd+7)%7)||7);return null}
const SESS=s=>/\b(london|londres|ldn)\b/.test(s)?'london':/\b(ny|new york|us open|cash open)\b/.test(s)?'ny':/\b(tokyo|asia|asian|asie)\b/.test(s)?'tokyo':null;
const LESS=[[/\b(fvg|fair value)/,'fvg'],[/\b(structure|bos|choch)/,'ms'],[/\b(liquidit)/,'liq'],[/\b(order ?blocks?|obs?)\b/,'ob'],[/\b(premium|discount)/,'pd'],[/\b(risk|position siz)/,'risk1'],[/\b(news)/,'news1'],[/\b(psycholog|tilt|discipline)/,'psy1']];
const A=(name,args={})=>({name,args});
function route(text,ctx={}){const now=ctx.now||Date.now(),raw=String(text||''),s=norm(raw);if(!s)return null;const r=(intent,actions,reply)=>({intent,actions,reply});
 // standing orders
 let m=raw.match(/^\s*(from now on|going forward|d[ée]sormais|dor[ée]navant|[àa] partir de maintenant|always remember( that)?|remember to always)[,:]?\s+(.+)$/i);if(m){const sub=route(m[3],ctx),acts=[A('standing_order',{action:'add',text:m[3].trim()}),...(sub&&!/^(nav|order)/.test(sub.intent)?sub.actions:[])];return r('order_add',acts,'Standing order saved: '+m[3].trim()+(acts.length>1?' (applied now too)':''))}
 if(/\b(forget|clear|delete|remove)\b.*\b(standing )?orders?\b/.test(s)&&/order/.test(s))return r('order_clear',[A('standing_order',{action:'clear'})],'Standing orders cleared.');
 const sy=sym(s),tf=TFR(s);
 // live session
 if(/\b(start|launch|begin|go|open)\b/.test(s)&&/\b(live|session|trading)\b/.test(s)&&!/\b(add|plan|schedule|tomorrow|lesson)\b/.test(s)||/\btrade with me\b|\bco ?pilot\b|\bgo live\b/.test(s)||/\btrade\b.*\blive\b/.test(s)&&sy)return r('live_start',[A('live_control',{action:'start',...(sy?{symbol:sy}:{}),...(tf?{timeframe:tf}:{})})],`Live session started${sy?' on '+sy:''}.`);
 if(/\b(stop|end|close|quit|finish)\b/.test(s)&&/\b(live|session|trading)\b/.test(s)&&!/\b(add|plan|tomorrow|today s plan|delete|remove|cancel)\b/.test(s))return r('live_stop',[A('live_control',{action:'stop'})],'Live session stopped.');
 // chart toggles
 if(/\btradingview\b/.test(s))return r('tv',[A('live_control',{action:/\b(off|hide|close|disable|back)\b/.test(s)?'tradingview_off':'tradingview_on'})],'TradingView view '+(/\b(off|hide|close|disable|back)\b/.test(s)?'off':'on')+'.');
 if(/\b(hide|show)\b.*\bchart\b/.test(s))return r('chart',[A('live_control',{action:/\bhide\b/.test(s)?'hide_chart':'show_chart'})],/\bhide\b/.test(s)?'Chart hidden.':'Chart shown.');
 // notifications / alert toggles
 const on=/\b(on|enable|activate|allow|turn on|start|yes)\b/.test(s),off=/\b(off|disable|deactivate|mute|stop|silence|no more)\b/.test(s);
 const AL={sweeps:/\bsweeps?\b/,scanner:/\bscanner|opportunit/,news:/\bnews\b/,briefing:/\bbriefing\b/,stop:/\bdaily stop\b/,live:/\b(setups?|signals?)\b/};
 if(/\b(alerts?|notifications?)\b/.test(s)&&Object.values(AL).some(x=>x.test(s))&&(on||off)){const p={};for(const k in AL)if(AL[k].test(s))p[k]=!off;return r('alert_toggles',[A('set_alert_toggles',p)],'Alert toggles updated.')}
 if(/\bnotifications?\b|\bpush\b/.test(s)){if(/\btest\b/.test(s))return r('notif_test',[A('send_test_notification')],'Test notification sent.');if(/\bstatus\b|\bare\b.*\bon\b/.test(s))return r('notif_status',[A('notification_status')],'');if(off)return r('notif_off',[A('notifications_off')],'Notifications off.');if(on)return r('notif_on',[A('notifications_on')],'Turning notifications on.')}
 if(/\b(send|envoie)\b.*\btest\b/.test(s))return r('notif_test',[A('send_test_notification')],'Test notification sent.');
 // risk settings
 const rk={};m=s.match(/\b(?:account|capital|balance|solde)\b[^\d]{0,20}(\d[\d.,]*k?)/);if(m)rk.account_size=num(m[1]);
 m=s.match(/\bdaily (?:loss )?stop\b[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(?:%|percent)/);if(m)rk.daily_stop_pct=num(m[1]);
 m=s.match(/\brisk\b[^\d]{0,16}(\d+(?:[.,]\d+)?)\s*(?:%|percent)/)||s.match(/(\d+(?:[.,]\d+)?)\s*(?:%|percent)\s*(?:risk|per trade)/);if(m&&!/daily stop/.test(s.slice(0,s.indexOf(m[0]))))rk.risk_pct=num(m[1]);
 m=s.match(/\bmax(?:imum)?\s*(?:of\s*)?(\d+)\s*trades?\b/)||s.match(/\b(\d+)\s*trades?\s*(?:max|per day|a day|par jour)/);if(m)rk.max_trades_per_day=+m[1];
 if(Object.keys(rk).length&&!/\?\s*$/.test(raw)&&!/\b(what if|should i|how much)\b/.test(s))return r('risk',[A('set_risk',rk)],'Risk settings updated.');
 // position size
 m=s.match(/\bentry\b\s*(\d[\d.,]*)\D+\bstop\b\s*(\d[\d.,]*)/);if(m){const pv=(s.match(/\b(?:point value|pv|per point)\D*(\d[\d.,]*)/)||[])[1];return r('possize',[A('position_size',{entry:num(m[1]),stop:num(m[2]),...(pv?{point_value:num(pv)}:{})})],'Position size calculated.')}
 // watchlist
 if(/\bwatchlist\b/.test(s)&&sy)return r('watchlist',[A('watchlist',{symbol:sy,action:/\b(remove|delete)\b/.test(s)?'remove':'add'})],'Watchlist updated.');
 // follow mode
 if(/\bfollow\b/.test(s)&&(on||off))return r('follow',[A('settings',{follow_mode:!off})],'Follow mode '+(off?'off':'on')+'.');
 // timeframe / symbol (live)
 if(tf&&(/\b(switch|change|set|timeframe|tf|chart|live|go)\b/.test(s)||s.split(' ').length<=3))return r('tf',[A('live_control',{action:'timeframe',timeframe:tf})],'Now analysing '+tf+'.');
 if(sy&&/\b(switch|change|watch|symbol|look at|analy[sz]e live|follow)\b/.test(s)&&!/\bwatchlist\b/.test(s))return r('symbol',[A('live_control',{action:'symbol',symbol:sy})],'Now watching '+sy+'.');
 // blocks
 const ses=SESS(s),d=dateOf(s,now);
 if(/\b(rest day|day off|clear)\b/.test(s)&&d&&!ses)return r('clear_day',[A('delete_block',{date:d})],'Day cleared.');
 if(ses&&/\b(delete|remove|cancel|drop)\b/.test(s))return r('del_block',[A('delete_block',{date:d||bkDate(now),session:ses})],'Session removed.');
 if(ses&&/\b(add|plan|schedule|book|create|set|new)\b/.test(s)){const t=s.match(/\b(\d{1,2})[:h](\d{2})?\s*(?:to|-|a|until)\s*(\d{1,2})[:h](\d{2})?/);const a={date:d||bkDate(now),session:ses};if(t){a.start=String(t[1]).padStart(2,'0')+':'+(t[2]||'00');a.end=String(t[3]).padStart(2,'0')+':'+(t[4]||'00')}if(sy)a.symbols=sy;return r('add_block',[A('set_block',a)],'Session added.')}
 // lessons
 if(/\blesson\b/.test(s)&&/\b(open|start|show|go)\b/.test(s)){for(const [re,id] of LESS)if(re.test(s))return r('lesson',[A('open_lesson',{id})],'Opening the lesson.')}
 m=s.match(/\b(?:teach me|teach|explain|apprends moi|apprends|explain to me|what is|what are|how do)\b\s*(?:about\s*)?(.+)$/);if(m&&LESS.some(([re])=>re.test(s)))return r('teach',[A('teach',{topic:m[1].replace(/\b(a|an|the|les?|la|des)\b/g,'').trim()})],'Opening a live lesson.');
 // navigation
 if(/\b(go|open|show|take me|switch|navigate|display)\b/.test(s)||s.split(' ').length<=2){for(const w of s.split(' ').reverse())if(TABS[w]&&!(w=='chart'&&/\blive\b/.test(s)))return r('nav',[A('navigate',{tab:TABS[w]})],'Opening '+TABS[w]+'.')}
 return null}
const api={route,norm,sym,TFR};if(typeof module!='undefined')module.exports=api;else root.DavosRouter=api})(this);
