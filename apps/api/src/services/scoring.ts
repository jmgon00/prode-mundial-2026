import { prisma } from '../lib/prisma'
import { Stage } from '@prisma/client'
import { checkAndAwardBadges, checkWoodenSpoon } from './badges'

const ELIMINATION_STAGES: Stage[] = [
  Stage.ROUND_OF_32,
  Stage.ROUND_OF_16,
  Stage.QUARTERFINAL,
  Stage.SEMIFINAL,
  Stage.THIRD_PLACE,
  Stage.FINAL,
]

export async function scoreMatch(matchId: string, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { stage: true } })
  if (!match) return

  const isElimination = ELIMINATION_STAGES.includes(match.stage)

  // Solo procesar predicciones que aún no tienen puntos calculados
  const predictions = await prisma.prediction.findMany({
    where: { matchId, pointsEarned: null },
  })

  for (const pred of predictions) {
    let points = 0
    const actualDraw = homeScore === awayScore
    const predDraw = pred.predictedHomeScore === pred.predictedAwayScore

    if (isElimination) {
      // --- Fase 2: lógica eliminatoria ---
      const actualWinner = homeScore > awayScore ? 'HOME' : 'AWAY'

      if (predDraw) {
        // Usuario predijo empate → aplica lógica tiebreak
        if (actualDraw) {
          // Hubo empate real → evaluar marcador exacto + tiebreak
          const exactScore =
            pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore
          const correctTiebreak = pred.tiebreakWinner !== null
          if (exactScore && correctTiebreak) {
            points = 6
          } else if (correctTiebreak) {
            points = 3
          }
        } else {
          // Predijo empate pero no hubo empate → 0 pts (Opción A)
          points = 0
        }
      } else {
        // Usuario predijo ganador directo
        const predWinner = pred.predictedHomeScore > pred.predictedAwayScore ? 'HOME' : 'AWAY'
        const exactScore =
          pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore
        const correctWinner = predWinner === actualWinner

        if (exactScore) {
          points = 6
        } else if (correctWinner) {
          points = 3
        }
      }
    } else {
      // --- Fase 1: lógica grupos ---
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
