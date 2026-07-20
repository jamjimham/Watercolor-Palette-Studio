// Palette Studio — Service Worker
// Provides offline support for a single-file PWA: on install, the app shell
// (index.html, manifest, icons) is cached. On every fetch, we try the cache
// first for same-origin navigations/assets so the app opens instantly even
// with no connection, then fall back to network for anything not cached,
// and fall back to the cached shell if a navigation request fails entirely
// (e.g. opening the app while genuinely offline).
//
// Cache version is bumped manually whenever the app's core files change, so
// old caches get cleaned up and users pick up new versions on next load.
const CACHE_VERSION = 'palette-studio-v1';
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

  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(networkResp){
        // Opportunistically cache anything new we fetch from our own origin
        // so it's available offline next time too.
        var copy = networkResp.clone();
        caches.open(CACHE_VERSION).then(function(cache){ cache.put(req, copy); });
        return networkResp;
      }).catch(function(){
        // Offline and not cached — for a page navigation, fall back to the
        // cached app shell rather than showing the browser's default
        // offline error page.
        if(req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', {status:503, statusText:'Offline'});
      });
    })
  );
});
