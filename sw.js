const CACHE='tcp-mastery-v33-pwa-hardened-2';
const PAYLOAD=Array.from({length:8},(_,i)=>`./payload/chunk-${String(i).padStart(2,'0')}.txt`);
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png',...PAYLOAD];
const OFFLINE_URL='./index.html';

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE);
          cache.put(OFFLINE_URL,fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(e){
        return (await caches.match(OFFLINE_URL)) ||
          new Response('<h1>TCP Mastery is offline</h1><p>Reconnect once to finish installation.</p>',
          {headers:{'Content-Type':'text/html; charset=utf-8'},status:503});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const fresh=await fetch(req);
      if(fresh&&fresh.ok){
        const cache=await caches.open(CACHE);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch(e){
      return new Response('',{status:504,statusText:'Offline'});
    }
  })());
});
