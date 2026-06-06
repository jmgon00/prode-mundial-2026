const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Error en la solicitud')
  return data as T
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

// --- Auth ---
export interface AuthUser {
  id: string
  email: string
  username: string
  isAdmin: boolean
  avatarUrl?: string | null
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/login', data),
}

// --- Leagues ---
export interface League {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  tournament: string
  createdAt: string
  members: LeagueMember[]
  penalties: Penalty[]
}

export interface LeagueMember {
  id: string
  userId: string
  role: 'OWNER' | 'MEMBER'
  totalPoints: number
  user?: { id: string; username: string; avatarUrl: string | null }
}

export interface Penalty {
  id: string
  description: string
  position: number
}

export const leagueApi = {
  create: (data: { name: string; penalties?: { description: string; position: number }[] }) =>
    api.post<League>('/api/leagues', data),
  join: (code: string) =>
    api.post<{ message: string; league: League }>(`/api/leagues/join/${code}`, {}),
  list: () => api.get<League[]>('/api/leagues'),
  get: (id: string) => api.get<League>(`/api/leagues/${id}`),
  addPenalty: (leagueId: string, data: { description: string; position: number; type: 'REWARD' | 'PENALTY' }) =>
    api.post<Penalty>(`/api/leagues/${leagueId}/penalties`, data),
  deletePenalty: (leagueId: string, penaltyId: string) =>
    api.delete<{ message: string }>(`/api/leagues/${leagueId}/penalties/${penaltyId}`),
}

// --- Matches ---
export interface Match {
  id: string
  stage: string
  group: string | null
  homeTeam: string
  awayTeam: string
  matchDate: string
  homeScore: number | null
  awayScore: number | null
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
}

export interface MatchSummary {
  next: Match | null
  recent: Match[]
  upcoming: Match[]
}

export interface GroupTeam {
  teamId: string
  name_en: string
  fifa_code: string
  mp: number
  w: number
  d: number
  l: number
  pts: number
  gf: number
  ga: number
  gd: number
}

export interface GroupStanding {
  group: string
  teams: GroupTeam[]
}

export const matchApi = {
  list: (params?: { stage?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return api.get<Match[]>(`/api/matches${qs}`)
  },
  summary: () => api.get<MatchSummary>('/api/matches/summary'),
}

export const groupsApi = {
  list: () => api.get<GroupStanding[]>('/api/groups'),
}

// --- Predictions ---
export interface Prediction {
  id: string
  matchId: string
  leagueId: string
  predictedHomeScore: number
  predictedAwayScore: number
  pointsEarned: number | null
  match?: Match
}

export interface MatchPrediction {
  userId: string
  username: string
  predictedHomeScore: number
  predictedAwayScore: number
  pointsEarned: number
}

export const predictionApi = {
  upsert: (data: {
    matchId: string
    leagueId: string
    predictedHomeScore: number
    predictedAwayScore: number
  }) => api.post<Prediction>('/api/predictions', data),
  listByLeague: (leagueId: string) =>
    api.get<Prediction[]>(`/api/predictions/league/${leagueId}`),
  byMatch: (matchId: string, leagueId: string) =>
    api.get<MatchPrediction[]>(`/api/predictions/match/${matchId}/league/${leagueId}`),
}

// --- Users ---
export const userApi = {
  updateMe: (data: { username?: string; currentPassword?: string; newPassword?: string; avatar?: string }) =>
    api.patch<{ user: AuthUser }>('/api/users/me', data),
}

// --- Fun Bets ---
export interface FunBet {
  id: string
  matchId: string
  leagueId: string
  prediction: string
}

export interface FunBetReveal {
  userId: string
  username: string
  avatarUrl: string | null
  prediction: string
}

export const funBetsApi = {
  upsert: (data: { matchId: string; leagueId: string; prediction: string }) =>
    api.post<FunBet>('/api/funbets', data),
  listByLeague: (leagueId: string) =>
    api.get<FunBet[]>(`/api/funbets/league/${leagueId}`),
  byMatch: (matchId: string, leagueId: string) =>
    api.get<FunBetReveal[]>(`/api/funbets/match/${matchId}/league/${leagueId}`),
}

// --- Stats ---
export interface UserStats {
  totalPoints: number
  rank: number
  totalMembers: number
  predictionsCount: number
  finishedCount: number
  exact: number
  good: number
  winner: number
  miss: number
  accuracy: number
  bestStreak: number
}

export const statsApi = {
  league: (leagueId: string) => api.get<UserStats>(`/api/stats/league/${leagueId}`),
}

// --- Badges ---
export interface BadgeEntry {
  userId: string
  type: string
  matchId: string | null
  earnedAt: string
}

export const BADGE_META: Record<string, { emoji: string; label: string }> = {
  EXACT_SCORE:          { emoji: '🎯', label: 'Marcador exacto' },
  THREE_IN_A_ROW:       { emoji: '🔥', label: '3 exactos seguidos' },
  FLAWLESS_GROUP_STAGE: { emoji: '⭐', label: 'Fase de grupos perfecta' },
  DARK_HORSE:           { emoji: '🐴', label: 'Dark horse' },
  WOODEN_SPOON:         { emoji: '🥄', label: 'Cuchara de madera' },
}

export const badgeApi = {
  listByLeague: (leagueId: string) =>
    api.get<BadgeEntry[]>(`/api/badges/league/${leagueId}`),
}

// --- Admin ---
export interface StageStatus {
  stage: string
  total: number
  active: number
  isUnlocked: boolean
}

export interface SyncResult {
  finished: number
  live: number
  errors: string[]
  timestamp: string
}

export const adminApi = {
  claim: () => api.post<{ message: string; user: AuthUser }>('/api/admin/claim', {}),
  stages: () => api.get<StageStatus[]>('/api/admin/stages'),
  unlockStage: (stage: string) => api.post<{ message: string }>(`/api/admin/stages/${stage}/unlock`, {}),
  lockStage: (stage: string) => api.post<{ message: string }>(`/api/admin/stages/${stage}/lock`, {}),
  matches: () => api.get<Match[]>('/api/admin/matches'),
  seedMatches: () => api.post<{ message: string }>('/api/admin/seed-matches', {}),
  setResult: (id: string, homeScore: number, awayScore: number) =>
    api.patch<Match>(`/api/admin/matches/${id}/result`, { homeScore, awayScore }),
  setTeams: (id: string, homeTeam: string, awayTeam: string) =>
    api.patch<Match>(`/api/admin/matches/${id}/teams`, { homeTeam, awayTeam }),
  setStatus: (id: string, status: 'LIVE' | 'SCHEDULED') =>
    api.patch<Match>(`/api/admin/matches/${id}/status`, { status }),
  resetData: () => api.post<{ message: string }>('/api/admin/reset-data', {}),
  syncStatus: () => api.get<SyncResult | null>('/api/admin/sync-status'),
  syncNow: () => api.post<SyncResult>('/api/admin/sync-now', {}),
  funBetsByMatch: (matchId: string) => api.get<AdminFunBet[]>(`/api/admin/funbets/${matchId}`),
  awardFunBet: (id: string) => api.patch<{ message: string; pointsEarned: number }>(`/api/admin/funbets/${id}/award`, {}),
  revokeFunBet: (id: string) => api.patch<{ message: string; pointsEarned: null }>(`/api/admin/funbets/${id}/revoke`, {}),
}

export interface AdminFunBet {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  leagueId: string
  leagueName: string
  prediction: string
  pointsEarned: number | null
}

// --- Rankings ---
export interface RankingEntry {
  position: number
  userId: string
  username: string
  avatarUrl: string | null
  totalPoints: number
  role: 'OWNER' | 'MEMBER'
}

export interface VerdictEntry {
  position: number
  userId: string
  username: string
  totalPoints: number
  reward: string | null
  penalty: string | null
}

export const rankingApi = {
  get: (leagueId: string) =>
    api.get<RankingEntry[]>(`/api/rankings/league/${leagueId}`),
  verdict: (leagueId: string) =>
    api.get<{ leagueId: string; verdict: VerdictEntry[] }>(`/api/rankings/league/${leagueId}/verdict`),
}
