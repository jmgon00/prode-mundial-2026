import { prisma } from '../lib/prisma'
import { scoreMatch } from './scoring'

const API_BASE = 'https://worldcup26.ir'

interface ApiGame {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string
  away_score: string
  local_date: string
  finished: string
  type: string
}

// EN name (lowercase) → nuestro nombre ES en la DB
const EN_TO_ES: Record<string, string> = {
  'mexico': 'México',
  'south africa': 'Sudáfrica',
  'south korea': 'Corea del Sur',
  'korea republic': 'Corea del Sur',
  'republic of korea': 'Corea del Sur',
  'czech republic': 'Rep. Checa',
  'czechia': 'Rep. Checa',
  'canada': 'Canadá',
  'bosnia and herzegovina': 'Bosnia y Herz.',
  'bosnia & herzegovina': 'Bosnia y Herz.',
  'bosnia-herzegovina': 'Bosnia y Herz.',
  'qatar': 'Qatar',
  'switzerland': 'Suiza',
  'brazil': 'Brasil',
  'morocco': 'Marruecos',
  'haiti': 'Haití',
  'scotland': 'Escocia',
  'united states': 'Estados Unidos',
  'usa': 'Estados Unidos',
  'paraguay': 'Paraguay',
  'australia': 'Australia',
  'turkey': 'Turquía',
  'turkiye': 'Turquía',
  'germany': 'Alemania',
  "curaçao": 'Curazao',
  'curacao': 'Curazao',
  "côte d'ivoire": 'Costa de Marfil',
  "cote d'ivoire": 'Costa de Marfil',
  'ivory coast': 'Costa de Marfil',
  'ecuador': 'Ecuador',
  'netherlands': 'Países Bajos',
  'japan': 'Japón',
  'sweden': 'Suecia',
  'tunisia': 'Túnez',
  'belgium': 'Bélgica',
  'egypt': 'Egipto',
  'iran': 'Irán',
  'new zealand': 'Nueva Zelanda',
  'spain': 'España',
  'cape verde': 'Cabo Verde',
  'cabo verde': 'Cabo Verde',
  'saudi arabia': 'Arabia Saudita',
  'uruguay': 'Uruguay',
  'france': 'Francia',
  'senegal': 'Senegal',
  'iraq': 'Irak',
  'norway': 'Noruega',
  'argentina': 'Argentina',
  'algeria': 'Argelia',
  'austria': 'Austria',
  'jordan': 'Jordania',
  'portugal': 'Portugal',
  'dr congo': 'Congo',
  'congo dr': 'Congo',
  'congo, dr': 'Congo',
  'democratic republic of the congo': 'Congo',
  'dem. rep. congo': 'Congo',
  'uzbekistan': 'Uzbekistán',
  'colombia': 'Colombia',
  'england': 'Inglaterra',
  'croatia': 'Croacia',
  'ghana': 'Ghana',
  'panama': 'Panamá',
}

function resolveEsName(nameEn: string): string | null {
  return EN_TO_ES[nameEn.toLowerCase().trim()] ?? null
}

async function apiFetch<T>(path: string, key: string): Promise<T[]> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`worldcup26 API error ${res.status} en ${path}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json()
  const data = json[key] ?? json
  return Array.isArray(data) ? data : []
}

export interface SyncResult {
  finished: number
  live: number
  errors: string[]
  timestamp: string
}

let isSyncing = false
export let lastSync: SyncResult | null = null

export async function syncWorldCupResults(): Promise<SyncResult> {
  if (isSyncing) {
    return lastSync ?? { finished: 0, live: 0, errors: ['Sync en progreso'], timestamp: new Date().toISOString() }
  }

  isSyncing = true
  const result: SyncResult = { finished: 0, live: 0, errors: [], timestamp: new Date().toISOString() }

  try {
    // Los juegos ya incluyen home_team_name_en / away_team_name_en — no necesitamos /get/teams
    const games = await apiFetch<ApiGame>('/get/games', 'games')
    const now = new Date()

    // Solo fase de grupos — los knockout tienen equipos placeholder en nuestra DB
    const groupGames = games.filter((g) => g.type === 'group')

    for (const game of groupGames) {
      const homeEn = game.home_team_name_en
      const awayEn = game.away_team_name_en

      const homeEs = resolveEsName(homeEn)
      const awayEs = resolveEsName(awayEn)
      if (!homeEs || !awayEs) {
        result.errors.push(`Sin mapeo para: "${homeEn}" / "${awayEn}"`)
        continue
      }

      const match = await prisma.match.findFirst({
        where: { homeTeam: homeEs, awayTeam: awayEs, status: { not: 'FINISHED' } },
      })
      if (!match) continue

      if (game.finished === 'TRUE') {
        const homeScore = Number(game.home_score)
        const awayScore = Number(game.away_score)
        await prisma.match.update({
          where: { id: match.id },
          data: { homeScore, awayScore, status: 'FINISHED' },
        })
        await scoreMatch(match.id, homeScore, awayScore)
        result.finished++
      } else if (now >= match.matchDate && match.status === 'SCHEDULED') {
        await prisma.match.update({ where: { id: match.id }, data: { status: 'LIVE' } })
        result.live++
      }
    }
  } catch (err: any) {
    result.errors.push(err.message ?? 'Error desconocido')
    console.error('[worldcup-sync] Error:', err.message)
  } finally {
    isSyncing = false
    lastSync = result
  }

  return result
}
