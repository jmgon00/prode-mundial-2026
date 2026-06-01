export type Stage = 'GROUP' | 'ROUND_OF_16' | 'QUARTERFINAL' | 'SEMIFINAL' | 'THIRD_PLACE' | 'FINAL'
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED'
export type Role = 'OWNER' | 'MEMBER'
export type BadgeType = 'EXACT_SCORE' | 'THREE_IN_A_ROW' | 'FLAWLESS_GROUP_STAGE' | 'DARK_HORSE' | 'WOODEN_SPOON'

export interface User {
  id: string
  email: string
  username: string
  avatarUrl?: string | null
}

export interface League {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  tournament: string
  createdAt: string
}

export interface Match {
  id: string
  stage: Stage
  homeTeam: string
  awayTeam: string
  matchDate: string
  homeScore?: number | null
  awayScore?: number | null
  status: MatchStatus
}

export interface Prediction {
  id: string
  userId: string
  matchId: string
  leagueId: string
  predictedHomeScore: number
  predictedAwayScore: number
  pointsEarned?: number | null
}

export interface RankingEntry {
  position: number
  userId: string
  username: string
  avatarUrl?: string | null
  totalPoints: number
  role: Role
}

export interface VerdictEntry extends RankingEntry {
  penalty: string | null
}
