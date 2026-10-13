/* ============================================================
   sw.js —— 整站共享的 Service Worker（作用域是整个站点根目录）
   三个工具页都注册的是这个文件（子目录里写 '../sw.js'）。
   改了任何前端文件后，把 CACHE 的版本号 +1，手机上打开两次即可更新。
   ============================================================ */
const CACHE = 'myapps-v4';

const ASSETS = [
  './',
  './index.html',
  './base.css',
  './home.css',
  './manifest.webmanifest',

  './answer/',
  './answer/index.html',
  './answer/answer.css',
  './answer/answer.js',
  './answer/manifest.webmanifest',

  './fortune/',
  './fortune/index.html',
  './fortune/fortune.css',
  './fortune/fortune.js',
  './fortune/almanac.js',
  './fortune/signs-data.js',
  './fortune/manifest.webmanifest',

  './jobs/',
  './jobs/index.html',
  './jobs/jobs.css',
  './jobs/jobs.js',
  './jobs/roles.js',
  './jobs/manifest.webmanifest',

  './learn/',
  './learn/index.html',
  './learn/learn.css',
  './learn/learn.js',
  './learn/course-data.js',
  './learn/manifest.webmanifest',

  './icons/home-180.png',
  './icons/home-192.png',
  './icons/home-512.png',
  './icons/home-maskable-512.png',
  './icons/answer-180.png',
  './icons/answer-192.png',
  './icons/answer-512.png',
  './icons/answer-maskable-512.png',
  './icons/fortune-180.png',
  './icons/fortune-192.png',
  './icons/fortune-512.png',
  './icons/fortune-maskable-512.png',
  './icons/jobs-180.png',
  './icons/jobs-192.png',
  './icons/jobs-512.png',
  './icons/jobs-maskable-512.png',
  './icons/learn-180.png',
  './icons/learn-192.png',
  './icons/learn-512.png',
  './icons/learn-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 逐个 add 并吞掉单个失败：某个文件改名/缺失时，不至于整个 SW 装不上
      .then((cache) => Promise.all(ASSETS.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先（保证能拿到最新版），断网时回退到缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((exact) => {
            if (exact) return exact;
            const p = url.pathname;
            const tryList = [p.endsWith('/') ? p + 'index.html' : p + '/',
                             './index.html'];
            return tryList.reduce(
              (chain, cand) => chain.then((found) => found || caches.match(cand)),
              Promise.resolve(null)
            ).then((found) => found || Response.error());
          })
        )
    );
    return;
  }

  // 静态资源：缓存优先，未命中再走网络并补进缓存
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
