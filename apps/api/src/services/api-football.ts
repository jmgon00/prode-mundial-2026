import { env } from '../config/env'

const BASE_URL = 'https://v3.football.api-sports.io'
const WORLD_CUP_2026_ID = 1 // FIFA World Cup

export interface MatchStats {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  extraTime: boolean       // hubo prórroga
  penaltyShootout: boolean // se definió por penales
  goals: GoalEvent[]
  cards: CardEvent[]
  penalties: PenaltyEvent[]
}

export interface GoalEvent {
  team: 'home' | 'away'
  minute: number           // minuto real (incluyendo extra time prefix)
  type: string             // 'Normal Goal' | 'Own Goal' | 'Penalty' | 'Missed Penalty'
  detail: string           // más detalle del tipo de gol
  player: string
}

export interface CardEvent {
  team: 'home' | 'away'
  minute: number
  type: 'Yellow Card' | 'Red Card' | 'Yellow Red Card'
  player: string
}

export interface PenaltyEvent {
  team: 'home' | 'away'
  scored: boolean
  player: string
}

async function apiFetch<T>(path: string): Promise<T> {
  if (!env.API_FOOTBALL_KEY) throw new Error('API_FOOTBALL_KEY no configurada')

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'x-apisports-key': env.API_FOOTBALL_KEY,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`API-Football error ${res.status}`)
  const json: any = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(json.errors)}`)
  }
  return json.response as T
}

// Buscar el fixture_id de la API-Football dado los nombres de los equipos y la fecha
export async function findFixtureId(homeTeam: string, awayTeam: string, matchDate: Date): Promise<number | null> {
  try {
    const dateStr = matchDate.toISOString().split('T')[0]
    const data = await apiFetch<any[]>(`/fixtures?league=${WORLD_CUP_2026_ID}&season=2026&date=${dateStr}`)

    if (!data || data.length === 0) return null

    // Normalizar para comparar
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    const homeNorm = normalize(homeTeam)
    const awayNorm = normalize(awayTeam)

    for (const fixture of data) {
      const h = normalize(fixture.teams?.home?.name ?? '')
      const a = normalize(fixture.teams?.away?.name ?? '')
      if (h.includes(homeNorm) || homeNorm.includes(h) || a.includes(awayNorm) || awayNorm.includes(a)) {
        return fixture.fixture?.id ?? null
      }
    }
    return null
  } catch (err: any) {
    console.error('[api-football] findFixtureId error:', err.message)
    return null
  }
}

// Obtener estadísticas detalladas de un fixture
export async function getMatchStats(fixtureId: number): Promise<MatchStats | null> {
  try {
    const data = await apiFetch<any[]>(`/fixtures?id=${fixtureId}`)
    if (!data || data.length === 0) return null

    const fixture = data[0]
    const events: any[] = fixture.events ?? []
    const score = fixture.score ?? {}
    const teams = fixture.teams ?? {}

    const homeId = teams.home?.id
    const awayId = teams.away?.id

    // Extra time y penales
    const extraTime = !!(score.extratime?.home !== null && score.extratime?.home !== undefined)
    const penaltyShootout = !!(score.penalty?.home !== null && score.penalty?.home !== undefined)

    // Goles
    const goals: GoalEvent[] = events
      .filter((e) => e.type === 'Goal')
      .map((e) => ({
        team: e.team?.id === homeId ? 'home' : 'away',
        minute: e.time?.elapsed ?? 0,
        type: e.detail ?? 'Normal Goal',
        detail: e.comments ?? '',
        player: e.player?.name ?? '',
      }))

    // Tarjetas
    const cards: CardEvent[] = events
      .filter((e) => e.type === 'Card')
      .map((e) => ({
        team: e.team?.id === homeId ? 'home' : 'away',
        minute: e.time?.elapsed ?? 0,
        type: e.detail as CardEvent['type'],
        player: e.player?.name ?? '',
      }))

    // Penales (durante el partido, no shootout)
    const penalties: PenaltyEvent[] = events
      .filter((e) => e.type === 'Goal' && (e.detail === 'Penalty' || e.detail === 'Missed Penalty'))
      .map((e) => ({
        team: e.team?.id === homeId ? 'home' : 'away',
        scored: e.detail === 'Penalty',
        player: e.player?.name ?? '',
      }))

    return {
      fixtureId,
      homeTeam: teams.home?.name ?? '',
      awayTeam: teams.away?.name ?? '',
      homeScore: fixture.goals?.home ?? 0,
      awayScore: fixture.goals?.away ?? 0,
      extraTime,
      penaltyShootout,
      goals,
      cards,
      penalties,
    }
  } catch (err: any) {
    console.error('[api-football] getMatchStats error:', err.message)
    return null
  }
}
