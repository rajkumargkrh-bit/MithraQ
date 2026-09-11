const CACHE='mithraq-pwa-v2-blankfix';
const ASSETS=['./','./index.html','./style.css','./script.js','./manifest.webmanifest','./assets/mithra-icon-192.png','./assets/mithra-icon-512.png','./assets/mithra-logo.png'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const request=event.request;
  const isNavigation=request.mode==='navigate';

  event.respondWith(
    caches.match(request,{ignoreSearch:true}).then(cached=>{
      if(cached) return cached;
      return fetch(request).then(response=>{
        if(response && response.ok && new URL(request.url).origin===self.location.origin){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>{
        // Only HTML navigation may fall back to index.html.
        // Never return HTML for JS/CSS/image requests: that causes a blank app offline.
        if(isNavigation) return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});
