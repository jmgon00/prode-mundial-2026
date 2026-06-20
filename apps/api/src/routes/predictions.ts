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

// Admin: cargar pronóstico retroactivo para un usuario (partidos LIVE o FINISHED)
const adminLoadSchema = z.object({
  matchId:            z.string().uuid(),
  userId:             z.string().uuid(),
  leagueId:           z.string().uuid(),
  predictedHomeScore: z.number().int().min(0),
  predictedAwayScore: z.number().int().min(0),
})

router.post('/admin-load', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const admin = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!admin?.isAdmin) throw new AppError(403, 'Solo admins pueden cargar pronósticos retroactivos')

    const data = adminLoadSchema.parse(req.body)

    const match = await prisma.match.findUnique({ where: { id: data.matchId } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (match.status === 'SCHEDULED') throw new AppError(400, 'El partido aún no comenzó')

    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId_leagueId: { userId: data.userId, matchId: data.matchId, leagueId: data.leagueId } },
    })
    if (existing) throw new AppError(400, 'El usuario ya tiene pronóstico para este partido en esta liga')

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: data.leagueId, userId: data.userId } },
    })
    if (!isMember) throw new AppError(403, 'El usuario no es miembro de esta liga')

    const prediction = await prisma.prediction.create({
      data: {
        userId:             data.userId,
        matchId:            data.matchId,
        leagueId:           data.leagueId,
        predictedHomeScore: data.predictedHomeScore,
        predictedAwayScore: data.predictedAwayScore,
        loadedByAdmin:      true,
      },
    })

    // Si el partido ya terminó con scores, calcular puntos inmediatamente
    if (match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
      let points = 0
      const actualResult = Math.sign(match.homeScore - match.awayScore)
      const predResult   = Math.sign(data.predictedHomeScore - data.predictedAwayScore)

      if (data.predictedHomeScore === match.homeScore && data.predictedAwayScore === match.awayScore) {
        points = 3
      } else if (predResult === actualResult && Math.abs(data.predictedHomeScore - data.predictedAwayScore) === Math.abs(match.homeScore - match.awayScore)) {
        points = 2
      } else if (predResult === actualResult) {
        points = 1
      }

      const updated = await prisma.prediction.update({
        where: { id: prediction.id },
        data:  { pointsEarned: points },
      })

      if (points > 0) {
        await prisma.leagueMember.updateMany({
          where: { leagueId: data.leagueId, userId: data.userId },
          data:  { totalPoints: { increment: points } },
        })
      }

      return res.status(201).json({ ...updated, pointsAwarded: points })
    }

    res.status(201).json(prediction)
  } catch (err) { next(err) }
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
