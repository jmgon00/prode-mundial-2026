import { prisma } from '../lib/prisma'
import { findFixtureId, getMatchStats, MatchStats } from './api-football'

// IDs de categorías que podemos auto-validar
const CATEGORY_IDS = {
  DOS_EXPULSADOS:  'fbc-01', // Expulsan a 2 jugadores (3pts)
  GOL_ANTES_10:    'fbc-02', // Gol antes del minuto 10
  GOL_DESPUES_80:  'fbc-03', // Gol después del minuto 80
  PENAL_COBRADO:   'fbc-04', // Se cobra un penal (convertido o errado)
  PRORROGA:        'fbc-05', // El partido se define en prórroga
  PENALES:         'fbc-06', // El partido se define por penales
  TARJETA_AMARILLA:'fbc-07', // Tarjeta amarilla
  TARJETA_ROJA:    'fbc-08', // Tarjeta roja
} as const

// Categorías especiales — NO auto-validables
export const SPECIAL_CATEGORY_IDS = ['fbc-09', 'fbc-10', 'fbc-11', 'fbc-12']

// Evalúa qué categorías ocurrieron en base a las stats
function evaluateCategories(stats: MatchStats): Set<string> {
  const occurred = new Set<string>()

  // Tarjetas rojas >= 2
  const redCards = stats.cards.filter((c) => c.type === 'Red Card' || c.type === 'Yellow Red Card')
  if (redCards.length >= 2) occurred.add(CATEGORY_IDS.DOS_EXPULSADOS)

  // Tarjeta amarilla (al menos una)
  const yellowCards = stats.cards.filter((c) => c.type === 'Yellow Card')
  if (yellowCards.length >= 1) occurred.add(CATEGORY_IDS.TARJETA_AMARILLA)

  // Tarjeta roja (al menos una)
  if (redCards.length >= 1) occurred.add(CATEGORY_IDS.TARJETA_ROJA)

  // Gol antes del minuto 10 (minuto <= 9)
  const earlyGoal = stats.goals.find((g) => g.minute <= 9 && g.type !== 'Missed Penalty')
  if (earlyGoal) occurred.add(CATEGORY_IDS.GOL_ANTES_10)

  // Gol después del minuto 80
  const lateGoal = stats.goals.find((g) => g.minute >= 81 && g.type !== 'Missed Penalty')
  if (lateGoal) occurred.add(CATEGORY_IDS.GOL_DESPUES_80)

  // Se cobró un penal (convertido o errado)
  if (stats.penalties.length >= 1) occurred.add(CATEGORY_IDS.PENAL_COBRADO)

  // Prórroga
  if (stats.extraTime) occurred.add(CATEGORY_IDS.PRORROGA)

  // Penales (shootout)
  if (stats.penaltyShootout) occurred.add(CATEGORY_IDS.PENALES)

  return occurred
}

export interface AutoValidateResult {
  matchId: string
  fixtureId: number | null
  statsFound: boolean
  awarded: number      // apuestas a las que se les dio puntos
  notOccurred: number  // apuestas que se descartaron (sin puntos)
  skipped: number      // apuestas especiales, sin tocar
  errors: string[]
}

export async function autoValidateFunBets(matchId: string): Promise<AutoValidateResult> {
  const result: AutoValidateResult = {
    matchId, fixtureId: null, statsFound: false,
    awarded: 0, notOccurred: 0, skipped: 0, errors: [],
  }

  try {
    // Obtener el partido
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) { result.errors.push('Partido no encontrado'); return result }

    // Buscar fixture en API-Football
    const fixtureId = await findFixtureId(match.homeTeam, match.awayTeam, match.matchDate)
    result.fixtureId = fixtureId

    if (!fixtureId) {
      result.errors.push(`No se encontró el fixture para ${match.homeTeam} vs ${match.awayTeam}`)
      return result
    }

    // Obtener stats
    const stats = await getMatchStats(fixtureId)
    if (!stats) {
      result.errors.push('No se pudieron obtener las estadísticas del partido')
      return result
    }
    result.statsFound = true

    // Evaluar qué ocurrió
    const occurred = evaluateCategories(stats)

    // Obtener todas las apuestas locas del partido sin puntos asignados aún
    const funBets = await prisma.funBet.findMany({
      where: { matchId, pointsEarned: null },
      include: { category: { select: { id: true, points: true } } },
    })

    for (const fb of funBets) {
      const catId = fb.categoryId

      // Categorías especiales — saltear, requieren validación manual
      if (SPECIAL_CATEGORY_IDS.includes(catId)) {
        result.skipped++
        continue
      }

      // Categorías auto-validables
      const autoCategories = Object.values(CATEGORY_IDS) as string[]
      if (!autoCategories.includes(catId)) {
        result.skipped++
        continue
      }

      if (occurred.has(catId)) {
        // Ocurrió → dar puntos
        const pts = fb.category.points
        await prisma.$transaction([
          prisma.funBet.update({ where: { id: fb.id }, data: { pointsEarned: pts } }),
          prisma.leagueMember.updateMany({
            where: { leagueId: fb.leagueId, userId: fb.userId },
            data: { totalPoints: { increment: pts } },
          }),
        ])
        result.awarded++
      } else {
        // No ocurrió → marcar con 0 (descartado)
        await prisma.funBet.update({ where: { id: fb.id }, data: { pointsEarned: 0 } })
        result.notOccurred++
      }
    }
  } catch (err: any) {
    result.errors.push(err.message ?? 'Error desconocido')
    console.error('[auto-validate] Error:', err.message)
  }

  return result
}
