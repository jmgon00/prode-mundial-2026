import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// GET /api/funbets/categories — catálogo de 14 opciones
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.funBetCategory.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, description: true, points: true },
    })
    res.json(categories)
  } catch (err) { next(err) }
})

// POST /api/funbets/ — crear apuesta (máximo 3 por partido)
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { matchId, leagueId, categoryId } = z.object({
      matchId:    z.string().uuid(),
      leagueId:   z.string().uuid(),
      categoryId: z.string().min(1),
    }).parse(req.body)

    const userId = req.userId!

    // El partido no puede haber empezado
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (match.status !== 'SCHEDULED') throw new AppError(400, 'El partido ya empezó o terminó')
    if (new Date() >= match.matchDate) throw new AppError(400, 'Ya no se pueden hacer apuestas para este partido')

    // El usuario debe ser miembro de la liga
    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    // La categoría debe existir
    const category = await prisma.funBetCategory.findUnique({ where: { id: categoryId } })
    if (!category) throw new AppError(404, 'Categoría no encontrada')

    // Máximo 3 apuestas por usuario por partido
    const existing = await prisma.funBet.count({ where: { userId, matchId, leagueId } })
    if (existing >= 3) throw new AppError(400, 'Ya tenés 3 apuestas en este partido')

    const funBet = await prisma.funBet.create({
      data: { userId, matchId, leagueId, categoryId },
      include: { category: { select: { id: true, description: true, points: true } } },
    })

    res.status(201).json(funBet)
  } catch (err) { next(err) }
})

// DELETE /api/funbets/:id — eliminar apuesta (solo antes que empiece)
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!
    const fb = await prisma.funBet.findUnique({
      where: { id: req.params.id },
      include: { match: { select: { status: true, matchDate: true } } },
    })
    if (!fb) throw new AppError(404, 'Apuesta no encontrada')
    if (fb.userId !== userId) throw new AppError(403, 'No es tu apuesta')
    if (fb.match.status !== 'SCHEDULED' || new Date() >= fb.match.matchDate) {
      throw new AppError(400, 'El partido ya empezó, no podés eliminar la apuesta')
    }

    await prisma.funBet.delete({ where: { id: fb.id } })
    res.json({ message: 'Apuesta eliminada' })
  } catch (err) { next(err) }
})

// GET /api/funbets/league/:leagueId — apuestas del usuario en esa liga
router.get('/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const funBets = await prisma.funBet.findMany({
      where: { userId, leagueId },
      include: { category: { select: { id: true, description: true, points: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(funBets)
  } catch (err) { next(err) }
})

// GET /api/funbets/match/:matchId/league/:leagueId — apuestas de todos (solo después que termine)
router.get('/match/:matchId/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { matchId, leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (match.status !== 'FINISHED') throw new AppError(400, 'El partido aún no terminó')

    const funBets = await prisma.funBet.findMany({
      where: { matchId, leagueId },
      include: {
        user:     { select: { id: true, username: true, avatarUrl: true } },
        category: { select: { id: true, description: true, points: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json(funBets.map((fb) => ({
      userId:       fb.userId,
      username:     fb.user.username,
      avatarUrl:    fb.user.avatarUrl,
      categoryId:   fb.categoryId,
      description:  fb.category.description,
      pointsEarned: fb.pointsEarned,
    })))
  } catch (err) { next(err) }
})

export default router
