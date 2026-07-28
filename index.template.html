// Palette Studio — Service Worker
// Provides offline support for a single-file PWA.
//
// Strategy: network-first for the app shell (index.html / navigations),
// cache-first for other static assets (icons, manifest).
//
// This app changes frequently between deploys. An earlier version of this
// file used cache-first for everything, which meant that once a device had
// the app cached, it kept being served a stale index.html indefinitely —
// CACHE_VERSION has to be bumped on every deploy for cache-first to notice
// a change, and across many real releases it wasn't. Network-first for the
// shell fixes that at the root: online users always get the current
// version; offline users still fall back to whatever was last cached.
const CACHE_VERSION = 'palette-studio-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon.svg',
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting(); // activate this version immediately
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_VERSION; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim(); // take control of open tabs right away
    })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;

  // Only handle same-origin GET requests — let everything else (Google
  // Fonts CDN, any cross-origin call) pass straight through to the network
  // untouched, since we don't want to try to own caching for third parties.
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  var isAppShellDoc = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if(isAppShellDoc){
    // Network-first: always try to get the latest HTML when online.
    event.respondWith(
      fetch(req).then(function(networkResp){
        var copy = networkResp.clone();
        caches.open(CACHE_VERSION).then(function(cache){ cache.put(req, copy); });
        return networkResp;
      }).catch(function(){
        // Offline — fall back to whatever was last cached for this exact
        // request, or the app shell's index.html as a last resort.
        return caches.match(req).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Everything else (icons, manifest, and other static assets) — cache-first
  // is fine here since these rarely change and it saves bandwidth.
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(networkResp){
        var copy = networkResp.clone();
        caches.open(CACHE_VERSION).then(function(cache){ cache.put(req, copy); });
        return networkResp;
      }).catch(function(){
        return new Response('', {status:503, statusText:'Offline'});
      });
    })
  );
});
