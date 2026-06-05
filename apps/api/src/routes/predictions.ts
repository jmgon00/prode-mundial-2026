import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

const predictionSchema = z.object({
  matchId: z.string().uuid(),
  leagueId: z.string().uuid(),
  predictedHomeScore: z.number().int().min(0),
  predictedAwayScore: z.number().int().min(0),
})

// Crear o actualizar predicción
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = predictionSchema.parse(req.body)
    const userId = req.userId!

    const match = await prisma.match.findUnique({ where: { id: data.matchId } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (match.status !== 'SCHEDULED') throw new AppError(400, 'El partido ya comenzó')
    if (new Date() >= match.matchDate) throw new AppError(400, 'Ya no se pueden cargar predicciones para este partido')

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: data.leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId_leagueId: { userId, matchId: data.matchId, leagueId: data.leagueId } },
      create: { userId, ...data },
      update: {
        predictedHomeScore: data.predictedHomeScore,
        predictedAwayScore: data.predictedAwayScore,
      },
    })

    res.status(201).json(prediction)
  } catch (err) {
    next(err)
  }
})

// Pronósticos de todos para un partido (solo disponible cuando el partido terminó)
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

    const predictions = await prisma.prediction.findMany({
      where: { matchId, leagueId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: [{ pointsEarned: 'desc' }, { createdAt: 'asc' }],
    })

    res.json(predictions.map((p) => ({
      userId: p.userId,
      username: p.user.username,
      predictedHomeScore: p.predictedHomeScore,
      predictedAwayScore: p.predictedAwayScore,
      pointsEarned: p.pointsEarned ?? 0,
    })))
  } catch (err) {
    next(err)
  }
})

// Predicciones del usuario en una liga
router.get('/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const predictions = await prisma.prediction.findMany({
      where: { userId, leagueId },
      include: { match: true },
      orderBy: { match: { matchDate: 'asc' } },
    })

    res.json(predictions)
  } catch (err) {
    next(err)
  }
})

export default router
