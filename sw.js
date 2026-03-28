// ⚡ 버전 바꾸면 캐시 자동 갱신 — 배포할 때마다 숫자 올리기
const VERSION = "v3";
const CACHE = `meeting-notes-${VERSION}`;

// 설치: 캐시에 저장
self.addEventListener("install", e => {
  self.skipWaiting(); // 즉시 활성화
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(["/manifest.json", "/icon-192.png", "/icon-512.png"])
      // index.html은 캐시 안 함 → 항상 최신본
    )
  );
});

// 활성화: 이전 버전 캐시 전부 삭제
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => {
            console.log("[SW] 이전 캐시 삭제:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim()) // 열려있는 탭에도 즉시 적용
  );
});

// 요청 처리
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // 외부 API는 캐시 완전 제외
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("anthropic.com") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("unpkg.com")
  ) return;

  // index.html: 항상 네트워크 우선, 실패 시만 캐시
  if (url.pathname === "/" || url.pathname === "/index.html") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 아이콘, manifest: 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
