import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Enviar un reporte (usuario autenticado)
router.post('/', requireAuth, async (req: any, res, next) => {
  try {
    const { description, page } = z.object({
      description: z.string().min(5, 'Describí el problema con al menos 5 caracteres').max(1000),
      page: z.string().optional(),
    }).parse(req.body)

    const report = await prisma.report.create({
      data: { userId: req.userId, description, page },
      select: { id: true, description: true, status: true, createdAt: true },
    })

    res.status(201).json({ message: 'Reporte enviado. ¡Gracias por avisarnos!', report })
  } catch (err) { next(err) }
})

export default router
