/* DAVOS presentational layer: orb state + alerts feed mirror. No app logic. */
(function(){
  var orb=document.getElementById('jvOrb'),st=document.getElementById('jvStatus'),feed=document.getElementById('jvAlerts');
  function busy(){var t=document.getElementById('typing');var b=!!t;orb&&orb.classList.toggle('busy',b);if(st)st.textContent=b?'Processing…':'Online · standing by'}
  var msgs=document.getElementById('msgs');if(msgs)new MutationObserver(busy).observe(msgs,{childList:true,subtree:true});
  function txt(el){return (el&&el.textContent||'').replace(/\s+/g,' ').trim()}
  function render(){if(!feed)return;var items=[],b=document.getElementById('banner');
    if(b&&!b.classList.contains('hidden')&&txt(b))items.push({k:b.classList.contains('warn')?'warn':'bad',t:txt(b)});
    var r=document.getElementById('riskBadge');if(r&&r.classList.contains('bad'))items.push({k:'bad',t:'Risk: '+txt(r)});
    var p=document.getElementById('prepStatus');if(p&&txt(p))items.push({k:'info',t:'Prep: '+txt(p)});
    var ev=document.getElementById('events');if(ev)Array.prototype.slice.call(ev.children,0,5).forEach(function(c){var t=txt(c);if(t)items.push({k:'jv-ev',t:t})});
    feed.innerHTML='';if(!items.length){feed.innerHTML='<p class="muted">No active alerts.</p>';return}
    items.forEach(function(i){var d=document.createElement('div');d.className='jv-al '+i.k;d.textContent=i.t;feed.appendChild(d)})}
  var q;function sched(){clearTimeout(q);q=setTimeout(render,120)}
  ['banner','riskBadge','prepStatus','events'].forEach(function(id){var e=document.getElementById(id);if(e)new MutationObserver(sched).observe(e,{childList:true,subtree:true,characterData:true,attributes:true})});
  render();busy();
})();
/* Feed API for server/chat worker:
   JARVIS.renderNewsReports([{headline,impact:'high'|'med'|'low',assets:[..],watch,time?,source?}])
   JARVIS.renderDailyBriefing({title?,date?,summary,points:[..],bias?}) */
(function(){
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
  function empty(box,msg){box.innerHTML='';var d=el('div','jv-empty');d.appendChild(el('span','jv-sample','Awaiting data'));d.appendChild(el('p','muted',msg));box.appendChild(d)}
  function renderNewsReports(list){var box=document.getElementById('jarvisNewsReports');if(!box)return;
    if(list&&!Array.isArray(list))list=list.items||list.reports||[list];
    if(!list||!list.length)return empty(box,'No reports yet. DAVOS will post headlines, impact, affected assets and what to watch here.');
    box.innerHTML='';list.forEach(function(r){var c=el('article','jv-rep');var h=el('div','jv-rephd');
      var im=String(r.impact||'low').toLowerCase();im=im[0]=='h'?'high':im[0]=='m'?'med':'low';
      h.appendChild(el('span','jv-imp '+im,im=='med'?'MED':im.toUpperCase()));h.appendChild(el('b',null,r.headline||r.title||''));c.appendChild(h);
      if(r.time||r.source)c.appendChild(el('div','muted jv-meta',[r.time,r.source].filter(Boolean).join(' · ')));
      var a=r.assets||[];if(a.length){var ch=el('div','jv-chips');a.forEach(function(s){ch.appendChild(el('span','jv-chip',s))});c.appendChild(ch)}
      if(r.watch){var w=el('div','jv-watch');w.appendChild(el('span',null,'What to watch: '));w.appendChild(document.createTextNode(r.watch));c.appendChild(w)}
      box.appendChild(c)})}
  function renderDailyBriefing(o){var box=document.getElementById('dailyBriefingBody');if(!box)return;
    if(typeof o=='string')o={summary:o};
    if(!o||!(o.summary||(o.points&&o.points.length)))return empty(box,'Today\u2019s briefing has not been generated yet. It will summarise sessions, key events and your plan.');
    box.innerHTML='';if(o.title||o.date)box.appendChild(el('div','jv-meta muted',[o.title,o.date].filter(Boolean).join(' · ')));
    if(o.bias)box.appendChild(el('span','jv-chip',o.bias));if(o.summary)box.appendChild(el('p',null,o.summary));
    if(o.points&&o.points.length){var u=el('ul','jv-pts');o.points.forEach(function(x){u.appendChild(el('li',null,x))});box.appendChild(u)}}
  window.JARVIS=Object.assign(window.JARVIS||{},{renderNewsReports:renderNewsReports,renderDailyBriefing:renderDailyBriefing});
  renderNewsReports(window.JARVIS_NEWS||[]);renderDailyBriefing(window.JARVIS_BRIEFING||null);
})();
