/* JARVIS service worker: Web Push + notification clicks (no offline caching, so deploys are never stale). */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch{d={title:'JARVIS',body:e.data&&e.data.text()}}
 e.waitUntil((async()=>{const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});cl.forEach(c=>c.postMessage({type:'push',data:d}));
  await self.registration.showNotification(d.title||'JARVIS',{body:d.body||'',tag:d.tag||undefined,renotify:!!d.tag,icon:'icons/icon-192.png',badge:'icons/badge-96.png',data:{tab:d.tab||'live',url:d.url||''},requireInteraction:d.tag=='live'})})())});
self.addEventListener('notificationclick',e=>{e.notification.close();const tab=(e.notification.data||{}).tab||'live',url=new URL('./?tab='+tab,self.registration.scope).href;
 e.waitUntil((async()=>{const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=cl.find(x=>x.url.startsWith(self.registration.scope));if(c){c.postMessage({type:'nav',tab});return c.focus()}return self.clients.openWindow(url)})())});
