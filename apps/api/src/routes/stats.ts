import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const [member, allMembers, predictions] = await Promise.all([
      prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId, userId } },
      }),
      prisma.leagueMember.findMany({
        where: { leagueId },
        select: { totalPoints: true },
      }),
      prisma.prediction.findMany({
        where: { userId, leagueId },
        include: { match: { select: { status: true, matchDate: true } } },
        orderBy: { match: { matchDate: 'asc' } },
      }),
    ])

    if (!member) throw new AppError(403, 'No sos miembro de esta liga')

    const finished = predictions.filter((p) => p.match.status === 'FINISHED')
    const exact  = finished.filter((p) => p.pointsEarned === 3).length
    const good   = finished.filter((p) => p.pointsEarned === 2).length
    const winner = finished.filter((p) => p.pointsEarned === 1).length
    const miss   = finished.filter((p) => (p.pointsEarned ?? 0) === 0).length
    const accuracy = finished.length > 0
      ? Math.round(((exact + good + winner) / finished.length) * 100)
      : 0

    let bestStreak = 0
    let currentStreak = 0
    for (const p of finished) {
      if ((p.pointsEarned ?? 0) > 0) {
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    const rank = allMembers.filter((m) => m.totalPoints > member.totalPoints).length + 1

    res.json({
      totalPoints: member.totalPoints,
      rank,
      totalMembers: allMembers.length,
      predictionsCount: predictions.length,
      finishedCount: finished.length,
      exact,
      good,
      winner,
      miss,
      accuracy,
      bestStreak,
    })
  } catch (err) {
    next(err)
  }
})

export default router
