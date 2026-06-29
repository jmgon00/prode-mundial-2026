import webpush from 'web-push'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'

// Configurar VAPID una sola vez al importar
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_EMAIL,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string   // mismo tag = reemplaza notificación anterior del mismo tipo
  data?: Record<string, unknown>
}

/**
 * Manda una notificación push a todos los usuarios suscritos (o a uno en particular).
 */
export async function sendPushToAll(payload: PushPayload, userId?: string) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys no configuradas — notificaciones desactivadas')
    return
  }

  const subs = await prisma.pushSubscription.findMany({
    where: userId ? { userId } : undefined,
  })

  if (subs.length === 0) return

  const json = JSON.stringify({
    title:  payload.title,
    body:   payload.body,
    icon:   payload.icon  ?? '/icon-192.png',
    badge:  payload.badge ?? '/icon-96.png',
    tag:    payload.tag,
    data:   payload.data  ?? {},
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json,
      )
    )
  )

  // Limpiar suscripciones inválidas (410 Gone = el usuario desactivó notificaciones)
  const toDelete: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as any
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toDelete.push(subs[i].endpoint)
      } else {
        console.error('[push] Error enviando notificación:', err?.message ?? err)
      }
    }
  })

  if (toDelete.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: toDelete } },
    })
    console.log(`[push] Eliminadas ${toDelete.length} suscripciones inválidas`)
  }

  const ok = results.filter((r) => r.status === 'fulfilled').length
  console.log(`[push] Enviadas ${ok}/${subs.length} notificaciones: "${payload.title}"`)
}
