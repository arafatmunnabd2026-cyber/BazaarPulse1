// BazaarPulse Web Push & Background Service Worker
const CACHE_NAME = 'bazaarpulse-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Event
self.addEventListener('push', (event) => {
  let data = {
    title: 'বাজার প্লাস — বিশেষ অফার! 🛍️',
    body: 'আজকের সেরা ডিল ও নতুন ডিসকাউন্ট দেখতে ক্লিক করুন।',
    icon: '/bkash.png',
    badge: '/bkash.png',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'explore', title: 'অফার দেখুন (Explore Deals)' },
      { action: 'close', title: 'বন্ধ করুন (Dismiss)' }
    ],
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/bkash.png',
    badge: data.badge || '/bkash.png',
    image: data.image || undefined,
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'explore', title: 'অফার দেখুন' },
      { action: 'close', title: 'বন্ধ করুন' }
    ],
    tag: data.tag || 'bazaarpulse-promo-' + Date.now(),
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
