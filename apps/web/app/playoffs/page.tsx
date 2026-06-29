'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { matchApi, Match } from '@/lib/api'
import { getFlagUrl } from '@/lib/flags'
import { ArrowLeft, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGES = [
  { key: 'ROUND_OF_32',  label: 'Ronda de 32', short: 'R32' },
  { key: 'ROUND_OF_16',  label: 'Octavos',     short: 'Octavos' },
  { key: 'QUARTERFINAL', label: 'Cuartos',      short: 'Cuartos' },
  { key: 'SEMIFINAL',    label: 'Semifinal',    short: 'Semis' },
  { key: 'FINAL',        label: 'Final',        short: 'Final' },
]

function FlagImg({ team, size = 20 }: { team: string; size?: number }) {
  const url = getFlagUrl(team)
  if (!url) return <span className="inline-block rounded-sm bg-zinc-700" style={{ width: size, height: Math.round(size * 0.67) }} />
  return (
    <img
      src={url}
      alt={team}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded-sm object-cover flex-shrink-0"
      style={{ width: size, height: Math.round(size * 0.67) }}
    />
  )
}

function TeamRow({
  name, score, isWinner, isPending,
}: {
  name: string
  score: number | null
  isWinner: boolean
  isPending: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg',
      !isPending && isWinner  && 'bg-gradient-to-r from-amber-500/15 to-transparent',
      !isPending && !isWinner && 'opacity-60',
      isPending               && 'bg-zinc-800/50',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <FlagImg team={name} size={18} />
        <span className={cn(
          'text-[11px] leading-tight truncate',
          isWinner && !isPending ? 'text-white font-bold' : 'text-zinc-300',
          isPending && 'text-zinc-500 font-normal',
        )}>
          {name || <span className="text-zinc-600 italic">Por definir</span>}
        </span>
      </div>
      {score !== null && !isPending && (
        <span className={cn(
          'text-xs font-black flex-shrink-0 tabular-nums',
          isWinner ? 'text-amber-400' : 'text-zinc-500',
        )}>
          {score}
        </span>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const finished  = match.status === 'FINISHED'
  const live      = match.status === 'LIVE'
  const isPending = !finished && !live
  const homeWins  = finished && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore
  const awayWins  = finished && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden flex-shrink-0 w-[156px]',
      live     ? 'border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.15)]' :
      finished ? 'border-zinc-700/60' :
                 'border-zinc-800/60 bg-zinc-900/40',
    )}>
      {live && (
        <div className="bg-green-500/20 px-2.5 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">En vivo</span>
        </div>
      )}
      <div className="p-1.5 space-y-0.5 bg-zinc-900">
        <TeamRow name={match.homeTeam} score={match.homeScore} isWinner={homeWins} isPending={isPending} />
        <div className="border-t border-zinc-800/60 mx-1" />
        <TeamRow name={match.awayTeam} score={match.awayScore} isWinner={awayWins} isPending={isPending} />
      </div>
    </div>
  )
}

function EmptySlot() {
  return (
    <div className="w-[156px] flex-shrink-0 rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/20 p-3 flex items-center justify-center">
      <span className="text-zinc-700 text-[10px]">Por definir</span>
    </div>
  )
}

function StageColumn({ label, short, matches, expectedCount }: {
  label: string
  short: string
  matches: Match[]
  expectedCount: number
}) {
  const slots = [...matches]
  while (slots.length < expectedCount) slots.push(null as any)

  return (
    <div className="flex flex-col gap-3 flex-shrink-0">
      {/* Stage header */}
      <div className="text-center px-1 pb-1 border-b border-zinc-800">
        <p className="text-[11px] font-black text-white uppercase tracking-widest">{short}</p>
        <p className="text-[9px] text-zinc-600 mt-0.5">{label}</p>
      </div>

      {/* Matches */}
      <div className="flex flex-col justify-around gap-4 flex-1">
        {slots.map((m, i) =>
          m ? <MatchCard key={m.id} match={m} /> : <EmptySlot key={`empty-${i}`} />
        )}
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
      .then((results) => setMatches(results.flat()))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [isLoading])

  const byStage = (stage: string) =>
    matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())

  const thirdPlace = matches.find((m) => m.stage === 'THIRD_PLACE')

  const EXPECTED: Record<string, number> = {
    ROUND_OF_32: 16, ROUND_OF_16: 8, QUARTERFINAL: 4, SEMIFINAL: 2, FINAL: 1,
  }

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stadium">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stadium">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-white/8">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight tracking-tight">
                Eliminatorias
              </h1>
              <p className="text-zinc-500 text-[11px]">Mundial 2026 · Bracket</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto">
        <div className="flex gap-5 px-4 pt-6 pb-4 min-w-max items-start">
          {STAGES.map((s) => (
            <StageColumn
              key={s.key}
              label={s.label}
              short={s.short}
              matches={byStage(s.key)}
              expectedCount={EXPECTED[s.key] ?? 1}
            />
          ))}
        </div>
      </div>

      {/* Tercer puesto */}
      {thirdPlace && (
        <div className="px-4 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">
              🥉 Tercer Puesto
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <div className="flex justify-center">
            <MatchCard match={thirdPlace} />
          </div>
        </div>
      )}
    </div>
  )
}
