'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

type Permission = 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const [permission, setPermission] = useState<Permission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (!ok) return
    setPermission(Notification.permission as Permission)
    // Verificar si ya está suscrito en el backend
    api.get<{ subscribed: boolean }>('/api/push/status')
      .then((r) => setSubscribed(r.subscribed))
      .catch(() => {})
  }, [])

  async function subscribe() {
    if (!supported || loading) return
    setLoading(true)
    try {
      // 1. Registrar el service worker
      const reg = await navigator.serviceWorker.register('/sw.js')

      // 2. Pedir permiso al usuario
      const perm = await Notification.requestPermission()
      setPermission(perm as Permission)
      if (perm !== 'granted') return

      // 3. Obtener la VAPID public key del backend
      const { publicKey } = await api.get<{ publicKey: string }>('/api/push/vapid-public-key')

      // 4. Suscribirse al PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // 5. Enviar la suscripción al backend
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await api.post('/api/push/subscribe', {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      })

      setSubscribed(true)
    } catch (err) {
      console.error('[push] Error al suscribirse:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!supported || loading) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await api.delete('/api/push/subscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('[push] Error al desuscribirse:', err)
    } finally {
      setLoading(false)
    }
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}

// Helper: convertir base64url → Uint8Array (requerido por PushManager)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
