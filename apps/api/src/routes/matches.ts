import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Listar partidos (filtrable por stage o status)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { stage, status } = req.query
    const matches = await prisma.match.findMany({
      where: {
        isActive: true,
        ...(stage ? { stage: stage as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { matchDate: 'asc' },
    })
    res.json(matches)
  } catch (err) {
    next(err)
  }
})

// Resumen para el dashboard: próximo partido + últimos resultados
router.get('/summary', requireAuth, async (_req, res, next) => {
  try {
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const [next, recent, upcoming] = await Promise.all([
      prisma.match.findFirst({
        where: { isActive: true, status: 'SCHEDULED', matchDate: { gte: now } },
        orderBy: { matchDate: 'asc' },
      }),
      prisma.match.findMany({
        where: { status: 'FINISHED' },
        orderBy: { matchDate: 'desc' },
        take: 3,
      }),
      prisma.match.findMany({
        where: {
          isActive: true,
          status: { in: ['SCHEDULED', 'LIVE'] },
          matchDate: { gte: now, lte: in24h },
        },
        orderBy: { matchDate: 'asc' },
        take: 8,
      }),
    ])
    res.json({ next: next ?? null, recent, upcoming })
  } catch (err) {
    next(err)
  }
})

// Actualizar resultado (solo admin/sistema — simplificado para MVP)
const resultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  status: z.enum(['LIVE', 'FINISHED']),
})

router.patch('/:id/result', requireAuth, async (req, res, next) => {
  try {
    const { homeScore, awayScore, status } = resultSchema.parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeScore, awayScore, status },
    })

    if (status === 'FINISHED') {
      await scoreMatch(match.id, homeScore, awayScore)
    }

    res.json(match)
  } catch (err) {
    next(err)
  }
})

async function scoreMatch(matchId: string, homeScore: number, awayScore: number) {
  const predictions = await prisma.prediction.findMany({ where: { matchId } })

  for (const pred of predictions) {
    let points = 0
    const actualResult = Math.sign(homeScore - awayScore)
    const predResult = Math.sign(pred.predictedHomeScore - pred.predictedAwayScore)

    if (pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore) {
      points = 3
    } else if (
      predResult === actualResult &&
      Math.abs(pred.predictedHomeScore - pred.predictedAwayScore) ===
        Math.abs(homeScore - awayScore)
    ) {
      points = 2
    } else if (predResult === actualResult) {
      points = 1
    }

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { pointsEarned: points },
    })

    if (points > 0) {
      await prisma.leagueMember.updateMany({
        where: { leagueId: pred.leagueId, userId: pred.userId },
        data: { totalPoints: { increment: points } },
      })
    }
  }
}

export default router
