import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Ranking de una liga
router.get('/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const ranking = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { totalPoints: 'desc' },
    })

    const withPosition = ranking.map((member, idx) => ({
      position: idx + 1,
      userId: member.userId,
      username: member.user.username,
      avatarUrl: member.user.avatarUrl,
      totalPoints: member.totalPoints,
      role: member.role,
    }))

    res.json(withPosition)
  } catch (err) {
    next(err)
  }
})

// Desglose de puntos por usuario: predicciones vs apuestas locas
router.get('/league/:leagueId/breakdown', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, username: true } } },
    })

    const breakdown = await Promise.all(members.map(async (m) => {
      const [predPoints, funBetPoints] = await Promise.all([
        prisma.prediction.aggregate({
          where: { userId: m.userId, leagueId, pointsEarned: { not: null } },
          _sum: { pointsEarned: true },
        }),
        // Solo funBets de fase eliminatoria (fase 2)
        prisma.funBet.aggregate({
          where: {
            userId: m.userId,
            leagueId,
            pointsEarned: { gt: 0 },
            match: { stage: { in: ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'] } },
          },
          _sum: { pointsEarned: true },
        }),
      ])

      return {
        userId:           m.userId,
        username:         m.user.username,
        predictionPoints: predPoints._sum.pointsEarned ?? 0,
        funBetPoints:     funBetPoints._sum.pointsEarned ?? 0,
      }
    }))

    res.json(breakdown)
  } catch (err) { next(err) }
})

// Veredicto final con penitencias asignadas
router.get('/league/:leagueId/verdict', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const [ranking, penalties] = await Promise.all([
      prisma.leagueMember.findMany({
        where: { leagueId },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { totalPoints: 'desc' },
      }),
      prisma.penalty.findMany({ where: { leagueId } }),
    ])

    const totalMembers = ranking.length
    const rewards = penalties.filter((p) => p.type === 'REWARD')
    const penaltiesList = penalties.filter((p) => p.type === 'PENALTY')

    const verdict = ranking.map((member, idx) => {
      const position = idx + 1                        // 1 = best
      const reversePosition = totalMembers - idx      // 1 = worst

      const reward = rewards.find((r) => r.position === position)
      const penalty = penaltiesList.find((p) => p.position === reversePosition)

      return {
        position,
        userId: member.userId,
        username: member.user.username,
        totalPoints: member.totalPoints,
        reward: reward?.description ?? null,
        penalty: penalty?.description ?? null,
      }
    })

    res.json({ leagueId, verdict })
  } catch (err) {
    next(err)
  }
})

export default router
