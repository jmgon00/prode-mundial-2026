import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/league/:leagueId', requireAuth, async (req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({
      where: { leagueId: req.params.leagueId },
      select: { userId: true, type: true, matchId: true, earnedAt: true },
      orderBy: { earnedAt: 'asc' },
    })
    res.json(badges)
  } catch (err) {
    next(err)
  }
})

export default router
