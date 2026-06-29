import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// GET /api/push/vapid-public-key — el frontend necesita esta key para suscribirse
router.get('/vapid-public-key', (_req, res) => {
  if (!env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: 'Push notifications no configuradas' })
  }
  res.json({ publicKey: env.VAPID_PUBLIC_KEY })
})

// POST /api/push/subscribe — guardar suscripción del usuario
router.post('/subscribe', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { endpoint, keys } = z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth:   z.string(),
      }),
    }).parse(req.body)

    const userId = req.userId!

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    })

    res.json({ message: 'Suscripción guardada' })
  } catch (err) { next(err) }
})

// DELETE /api/push/subscribe — eliminar suscripción
router.delete('/subscribe', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body)
    const userId = req.userId!

    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } })
    if (!sub || sub.userId !== userId) throw new AppError(404, 'Suscripción no encontrada')

    await prisma.pushSubscription.delete({ where: { endpoint } })
    res.json({ message: 'Suscripción eliminada' })
  } catch (err) { next(err) }
})

// GET /api/push/status — saber si el usuario tiene suscripción activa
router.get('/status', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.pushSubscription.count({ where: { userId: req.userId! } })
    res.json({ subscribed: count > 0 })
  } catch (err) { next(err) }
})

export default router
