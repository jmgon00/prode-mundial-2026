import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

const updateSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

router.patch('/me', requireAuth, async (req: any, res, next) => {
  try {
    const { username, currentPassword, newPassword } = updateSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) throw new AppError(404, 'Usuario no encontrado')

    if (newPassword) {
      if (!currentPassword) throw new AppError(400, 'Ingresá tu contraseña actual')
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) throw new AppError(401, 'Contraseña actual incorrecta')
    }

    if (username && username !== user.username) {
      const taken = await prisma.user.findUnique({ where: { username } })
      if (taken) throw new AppError(409, 'Ese nombre de usuario ya está en uso')
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username ? { username } : {}),
        ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10) } : {}),
      },
      select: { id: true, email: true, username: true, isAdmin: true },
    })

    res.json({ user: updated })
  } catch (err) {
    next(err)
  }
})

export default router
