import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
const API_BASE = 'https://worldcup26.ir'

async function apiFetch<T>(path: string, key: string): Promise<T[]> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`worldcup26 API error ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json()
  const data = json[key] ?? json
  return Array.isArray(data) ? data : []
}

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [teams, groups] = await Promise.all([
      apiFetch<any>('/get/teams', 'teams'),
      apiFetch<any>('/get/groups', 'groups'),
    ])

    const teamMap = new Map(teams.map((t: any) => [String(t.id), t]))

    const result = groups
      .map((g: any) => ({
        group: g.name,
        teams: (g.teams ?? [])
          .map((t: any) => {
            const team: any = teamMap.get(String(t.team_id)) ?? {}
            return {
              teamId: String(t.team_id),
              name_en: team.name_en ?? '',
              fifa_code: team.fifa_code ?? '',
              mp: Number(t.mp),
              w: Number(t.w),
              d: Number(t.d),
              l: Number(t.l),
              pts: Number(t.pts),
              gf: Number(t.gf),
              ga: Number(t.ga),
              gd: Number(t.gd),
            }
          })
          .sort((a: any, b: any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
      }))
      .sort((a: any, b: any) => a.group.localeCompare(b.group))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
