/* HaniaFlight service worker: keeps the game playable offline once it has been opened. Generated into /sw.js by build.py. */
const CACHE='haniaflight-c4c57b4';
const SHELL=['./','index.html','vendor/three.min.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
/* fetch each file fresh (never from the HTTP cache) and report progress to the open page */
const tell=m=>self.clients.matchAll({includeUncontrolled:true,type:'window'}).then(cs=>cs.forEach(c=>c.postMessage(m)));
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(async c=>{let done=0;
  for(const u of SHELL){const res=await fetch(new Request(u,{cache:'reload'}));if(!res.ok)throw new Error('fetch '+u);await c.put(u,res);tell({type:'hf-progress',done:++done,total:SHELL.length});}
}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const keep=(req,res)=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return res;};
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    /* the page itself: open instantly from the cache and refresh it in the background, so a slow network never delays launch.
       A new version therefore shows up on the launch after it was downloaded. */
    if(r.mode==='navigate'){const fresh=fetch(r).then(x=>keep('index.html',x));
      e.respondWith(caches.match('index.html').then(m=>{if(m){e.waitUntil(fresh.catch(()=>{}));return m;}return fresh;}));return;}
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>keep(r,x))));return;}
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))
    e.respondWith(caches.match(r).then(m=>m||Promise.race([fetch(r).then(x=>keep(r,x)),new Promise(ok=>setTimeout(()=>ok(new Response('',{status:504})),2500))]).catch(()=>new Response('',{status:504}))));
});
