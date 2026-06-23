import { prisma } from '../lib/prisma'
import { Stage } from '@prisma/client'
import { checkAndAwardBadges, checkWoodenSpoon } from './badges'

export async function scoreMatch(matchId: string, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { stage: true } })
  if (!match) return

  // Solo procesar predicciones que aún no tienen puntos calculados
  const predictions = await prisma.prediction.findMany({
    where: { matchId, pointsEarned: null },
  })

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

  if (match.stage === Stage.FINAL) {
    const leagues = await prisma.league.findMany({ select: { id: true } })
    await Promise.all(leagues.map((l) => checkWoodenSpoon(l.id)))
  }
}
