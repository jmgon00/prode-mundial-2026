import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { requireAuth } from '../middleware/auth'


const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = registerSchema.parse(req.body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) throw new AppError(409, 'Email o username ya registrado')

    const passwordHash = await bcrypt.hash(password, 10)
    const isAdmin = env.ADMIN_EMAIL ? email === env.ADMIN_EMAIL : false
    const user = await prisma.user.create({
      data: { email, username, passwordHash, isAdmin },
      select: { id: true, email: true, username: true, isAdmin: true, avatarUrl: true },
    })

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    })

    res.status(201).json({ user, token })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new AppError(401, 'Credenciales inválidas')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'Credenciales inválidas')

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    })

    res.json({
      user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin, avatarUrl: user.avatarUrl },
      token,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, isAdmin: true, avatarUrl: true },
    })
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

export default router
