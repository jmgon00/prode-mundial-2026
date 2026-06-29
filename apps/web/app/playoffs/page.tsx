'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { matchApi, Match } from '@/lib/api'
import { getFlag } from '@/lib/flags'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGES = [
  { key: 'ROUND_OF_32', label: 'R32' },
  { key: 'ROUND_OF_16', label: 'Octavos' },
  { key: 'QUARTERFINAL', label: 'Cuartos' },
  { key: 'SEMIFINAL', label: 'Semis' },
  { key: 'FINAL', label: 'Final' },
]

function TeamRow({ name, score, isWinner, isPending }: {
  name: string
  score: number | null
  isWinner: boolean
  isPending: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors',
      isPending ? 'bg-zinc-800/60' :
      isWinner ? 'bg-amber-500/10' : 'bg-zinc-800/40',
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base leading-none flex-shrink-0">{getFlag(name)}</span>
        <span className={cn(
          'text-xs truncate',
          isWinner ? 'text-white font-semibold' : 'text-zinc-400',
          isPending && 'text-zinc-500',
        )}>
          {name || '—'}
        </span>
      </div>
      {score !== null && (
        <span className={cn(
          'text-xs font-bold flex-shrink-0 w-4 text-right',
          isWinner ? 'text-amber-400' : 'text-zinc-500',
        )}>
          {score}
        </span>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const finished = match.status === 'FINISHED'
  const homeWins = finished && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore
  const awayWins = finished && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore
  const isPending = !finished

  return (
    <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-1.5 w-[148px] flex-shrink-0 space-y-1">
      <TeamRow
        name={match.homeTeam}
        score={match.homeScore}
        isWinner={homeWins}
        isPending={isPending}
      />
      <TeamRow
        name={match.awayTeam}
        score={match.awayScore}
        isWinner={awayWins}
        isPending={isPending}
      />
    </div>
  )
}

function StageColumn({ label, matches }: { label: string; matches: Match[] }) {
  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center px-1">{label}</p>
      <div className="flex flex-col justify-around gap-3 flex-1">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
        {matches.length === 0 && (
          <div className="w-[148px] h-16 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center">
            <span className="text-zinc-700 text-xs">Por definir</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ThirdPlaceCard({ match }: { match: Match | undefined }) {
  if (!match) return null
  return (
    <div className="mt-6 px-4">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center">3er Puesto</p>
      <div className="flex justify-center">
        <MatchCard match={match} />
      </div>
    </div>
  )
}

export default function PlayoffsPage() {
  const { isLoading } = useProtected()
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    Promise.all(
      [...STAGES.map((s) => s.key), 'THIRD_PLACE'].map((stage) =>
        matchApi.list({ stage })
      )
    )
      .then((results) => {
        const all = results.flat()
        setMatches(all)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [isLoading])

  const byStage = (stage: string) =>
    matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())

  const thirdPlace = matches.find((m) => m.stage === 'THIRD_PLACE')

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stadium">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stadium">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">Cruces Eliminatorias</h1>
          <p className="text-zinc-500 text-xs">Mundial 2026</p>
        </div>
      </div>

      {/* Bracket — scroll horizontal */}
      <div className="overflow-x-auto pb-8">
        <div className="flex gap-6 px-4 pt-5 min-w-max items-start">
          {STAGES.map((s) => (
            <StageColumn key={s.key} label={s.label} matches={byStage(s.key)} />
          ))}
        </div>
      </div>

      {/* Tercer puesto separado */}
      <ThirdPlaceCard match={thirdPlace} />
    </div>
  )
}
