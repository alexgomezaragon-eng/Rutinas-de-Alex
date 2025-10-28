const CACHE_NAME = 'rutinas-alex-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/icon.svg',
  '/manifest.json',
  '/services/geminiService.ts',
  '/components/WorkoutList.tsx',
  '/components/WorkoutForm.tsx',
  '/components/StatsView.tsx',
  '/components/WorkoutSuggestion.tsx',
  '/components/icons/PlusIcon.tsx',
  '/components/icons/TrashIcon.tsx',
  '/components/icons/DumbbellIcon.tsx',
  '/components/icons/SparklesIcon.tsx',
  '/components/icons/ChartBarIcon.tsx',
  '/components/icons/CloudArrowDownIcon.tsx',
  '/components/icons/CloudArrowUpIcon.tsx',
  '/components/icons/ChevronDownIcon.tsx',
  '/components/icons/ScaleIcon.tsx',
  // CDN files are fetched via network, but the app shell is cached.
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/@google/genai@^1.27.0',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll to cache initial assets. If any fail, the SW install fails.
        // For external resources, it's better to fetch them and cache them on the fly.
        // We'll cache them with a "don't fail the install" approach.
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                console.warn(`Failed to cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request to use it in fetch and cache
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }
            // Do not cache non-GET requests
            if(event.request.method !== 'GET') {
              return response;
            }

            // Clone the response to use it in the browser and cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
            // Network request failed, try to serve a fallback if available
            // For this app, failing silently is acceptable as it's an enhancement
            console.error('Fetch failed; returning offline fallback if available.', err);
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});