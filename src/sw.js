/* HaniaFlight service worker: keeps the game playable offline once it has been opened. Generated into /sw.js by build.py. */
const CACHE='haniaflight-__VERSION__';
const SHELL=['./','index.html','vendor/three.min.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const keep=(req,res)=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return res;};
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    /* the page itself: newest version when online, cached copy when not */
    if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>keep('index.html',x)).catch(()=>caches.match('index.html')));return;}
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>keep(r,x))));return;}
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>keep(r,x)).catch(()=>new Response('',{status:504}))));
});
