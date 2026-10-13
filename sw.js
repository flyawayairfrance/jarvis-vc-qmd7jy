/* JARVIS service worker: Web Push + notification clicks (no offline caching, so deploys are never stale).
   Safari/WebKit revokes push permission if a push does not show a notification, so EVERY push calls showNotification first. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch{try{d={body:e.data.text()}}catch{}}
 const opts={body:d.body||'',tag:d.tag||'jarvis',icon:'icons/icon-192.png',badge:'icons/badge-96.png',data:{tab:d.tab||'live'}};if(d.tag)opts.renotify=true;
 const show=self.registration.showNotification(d.title||'JARVIS',opts).catch(()=>self.registration.showNotification(d.title||'JARVIS',{body:d.body||''}));
 const tell=self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cl=>cl.forEach(c=>c.postMessage({type:'push',data:d}))).catch(()=>{});
 e.waitUntil(Promise.allSettled([show,tell]))});
self.addEventListener('notificationclick',e=>{e.notification.close();const tab=(e.notification.data||{}).tab||'live',url=new URL('./?tab='+tab,self.registration.scope).href;
 e.waitUntil((async()=>{const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=cl.find(x=>x.url.startsWith(self.registration.scope));if(c){c.postMessage({type:'nav',tab});try{return await c.focus()}catch{return}}return self.clients.openWindow(url)})())});
