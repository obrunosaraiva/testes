// Kanban Pro — Service Worker (Push Notifications)

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kanban Pro', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'kanban',
      data: { url: data.url || '/' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const appWin = wins.find(w => w.url.startsWith(self.location.origin));
      if (appWin) return appWin.focus();
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
