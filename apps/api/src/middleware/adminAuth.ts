import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId
  if (!userId) return res.status(401).json({ message: 'No autenticado' })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!user?.isAdmin) return res.status(403).json({ message: 'Se requiere rol de administrador' })

  next()
}
