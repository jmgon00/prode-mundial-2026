// Service Worker — Prode Mundial 2026
// Maneja las push notifications cuando la app está cerrada

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Prode Mundial', body: event.data.text() }
  }

  const options = {
    body:    payload.body  ?? '',
    icon:    payload.icon  ?? '/icon-192.png',
    badge:   payload.badge ?? '/icon-96.png',
    tag:     payload.tag   ?? 'prode-notification',
    renotify: true,
    data:    payload.data  ?? {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// Al clickear la notificación, abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      // Si no, abrir una nueva
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})
