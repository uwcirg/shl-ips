/// <reference lib="webworker" />
import { build, version } from '$service-worker';

// A minimal service worker: it keeps the app installable and shows an offline page when a page
// can't be loaded. It never stores anything that depends on who is signed in. Only the built app
// files (the same for every user) and the offline page are cached; page loads, API calls, requests
// to other origins (such as the FHIR server) and anything carrying data are left to the network.
const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `app-shell-${version}`;
const OFFLINE_PAGE = '/offline.html';
const PRECACHE = [...build, OFFLINE_PAGE];
const precached = new Set(PRECACHE);

worker.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => worker.skipWaiting())
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Drop the caches of earlier versions
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only this app's own requests; never anything from another origin
  if (url.origin !== worker.location.origin) return;

  // Page loads always go to the network. Their HTML can carry the signed-in user's data, so it is
  // never cached; the offline page is shown only if the network request itself fails.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_PAGE)) ?? Response.error();
      })
    );
    return;
  }

  // Built app files are served from the precache; anything else is not handled here
  if (precached.has(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => (await cache.match(request)) ?? fetch(request))
    );
  }
});
