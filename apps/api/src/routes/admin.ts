import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/adminAuth'
import { Stage } from '@prisma/client'
import { checkAndAwardBadges, checkWoodenSpoon } from '../services/badges'

const router = Router()

// Promover al usuario actual como admin (solo si no existe ningún admin aún)
router.post('/claim', requireAuth, async (req: any, res, next) => {
  try {
    const adminExists = await prisma.user.findFirst({ where: { isAdmin: true } })
    if (adminExists) {
      return res.status(403).json({ message: 'Ya existe un administrador' })
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { isAdmin: true },
      select: { id: true, username: true, email: true, isAdmin: true },
    })
    res.json({ message: 'Sos el administrador ahora', user })
  } catch (err) {
    next(err)
  }
})

// Listar el estado de todas las etapas
router.get('/stages', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const stages = await prisma.match.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: {},
    })
    const activeStages = await prisma.match.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: { isActive: true },
    })
    const activeMap = new Map(activeStages.map((s) => [s.stage, s._count.id]))

    const STAGE_ORDER = ['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL']
    const result = STAGE_ORDER.map((stage) => {
      const total = stages.find((s) => s.stage === stage)?._count.id ?? 0
      const active = activeMap.get(stage as Stage) ?? 0
      return { stage, total, active, isUnlocked: active > 0 }
    }).filter((s) => s.total > 0)

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// Desbloquear una etapa (activa todos sus partidos)
router.post('/stages/:stage/unlock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stage = req.params.stage as Stage
    const { count } = await prisma.match.updateMany({
      where: { stage },
      data: { isActive: true },
    })
    res.json({ message: `${count} partidos de ${stage} activados` })
  } catch (err) {
    next(err)
  }
})

// Bloquear una etapa
router.post('/stages/:stage/lock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stage = req.params.stage as Stage
    const { count } = await prisma.match.updateMany({
      where: { stage, status: 'SCHEDULED' },
      data: { isActive: false },
    })
    res.json({ message: `${count} partidos de ${stage} desactivados` })
  } catch (err) {
    next(err)
  }
})

// Listar todos los partidos (para el panel de admin con resultados)
router.get('/matches', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const matches = await prisma.match.findMany({ orderBy: { matchDate: 'asc' } })
    res.json(matches)
  } catch (err) {
    next(err)
  }
})

// Cargar resultado de un partido
const resultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
})

router.patch('/matches/:id/result', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { homeScore, awayScore } = resultSchema.parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeScore, awayScore, status: 'FINISHED' },
    })

    await scoreMatch(match.id, homeScore, awayScore)
    res.json(match)
  } catch (err) {
    next(err)
  }
})

// Actualizar equipos de un partido (para cuando se conocen los clasificados)
router.patch('/matches/:id/teams', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { homeTeam, awayTeam } = z.object({
      homeTeam: z.string().min(1),
      awayTeam: z.string().min(1),
    }).parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeTeam, awayTeam },
    })
    res.json(match)
  } catch (err) {
    next(err)
  }
})

// Resetear todos los datos de prueba (mantiene partidos y admin)
router.post('/reset-data', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.badge.deleteMany(),
      prisma.prediction.deleteMany(),
      prisma.leagueMember.deleteMany(),
      prisma.penalty.deleteMany(),
      prisma.league.deleteMany(),
      prisma.user.deleteMany({ where: { isAdmin: false } }),
      prisma.match.updateMany({
        data: { homeScore: null, awayScore: null, status: 'SCHEDULED' },
      }),
      prisma.match.updateMany({
        where: { stage: { not: 'GROUP' } },
        data: { isActive: false },
      }),
      prisma.match.updateMany({
        where: { stage: 'GROUP' },
        data: { isActive: true },
      }),
    ])
    res.json({ message: 'Datos reseteados correctamente. Partidos y admin intactos.' })
  } catch (err) {
    next(err)
  }
})

// Correr el seed de partidos (solo si no hay partidos)
router.post('/seed-matches', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const existing = await prisma.match.count()
    if (existing > 0) {
      return res.json({ message: `Ya hay ${existing} partidos cargados. Nada que hacer.` })
    }

    const { seedMatches } = await import('../services/seed-matches')
    const count = await seedMatches()
    res.json({ message: `${count} partidos insertados correctamente` })
  } catch (err) {
    next(err)
  }
})

async function scoreMatch(matchId: string, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { stage: true } })
  if (!match) return

  const predictions = await prisma.prediction.findMany({ where: { matchId } })

  for (const pred of predictions) {
    let points = 0
    const actualResult = Math.sign(homeScore - awayScore)
    const predResult = Math.sign(pred.predictedHomeScore - pred.predictedAwayScore)

    if (pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore) {
      points = 3
    } else if (
      predResult === actualResult &&
      Math.abs(pred.predictedHomeScore - pred.predictedAwayScore) === Math.abs(homeScore - awayScore)
    ) {
      points = 2
    } else if (predResult === actualResult) {
      points = 1
    }

    await prisma.prediction.update({ where: { id: pred.id }, data: { pointsEarned: points } })

    if (points > 0) {
      await prisma.leagueMember.updateMany({
        where: { leagueId: pred.leagueId, userId: pred.userId },
        data: { totalPoints: { increment: points } },
      })
    }

    await checkAndAwardBadges(matchId, pred.userId, pred.leagueId, points, match.stage)
  }

  // WOODEN_SPOON: al finalizar la final, se premia al último de cada liga
  if (match.stage === Stage.FINAL) {
    const leagues = await prisma.league.findMany({ select: { id: true } })
    await Promise.all(leagues.map((l) => checkWoodenSpoon(l.id)))
  }
}

export default router
