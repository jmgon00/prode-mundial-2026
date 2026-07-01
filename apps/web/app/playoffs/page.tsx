'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { matchApi, Match } from '@/lib/api'
import { getFlagUrl } from '@/lib/flags'
import { ArrowLeft, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Layout constants ──────────────────────────────────────────────────────────
const CARD_W  = 158  // px — ancho de cada tarjeta de partido
const SLOT_H  = 80   // px — alto del "slot" de R32; se duplica cada ronda
const CONN_W  = 36   // px — ancho de la columna conector entre rondas
const LINE    = '#52525b' // zinc-600

const STAGES = [
  { key: 'ROUND_OF_32',  label: '16avos',  count: 16 },
  { key: 'ROUND_OF_16',  label: 'Octavos', count: 8  },
  { key: 'QUARTERFINAL', label: 'Cuartos', count: 4  },
  { key: 'SEMIFINAL',    label: 'Semis',   count: 2  },
  { key: 'FINAL',        label: 'Final',   count: 1  },
]

// ─── Flag image ────────────────────────────────────────────────────────────────
function Flag({ team }: { team: string }) {
  const url = getFlagUrl(team)
  if (!url) return <span className="inline-block w-[18px] h-[13px] rounded-sm bg-zinc-700 flex-shrink-0" />
  return (
    <img
      src={url}
      alt={team}
      width={18}
      height={13}
      className="rounded-sm object-cover flex-shrink-0"
      style={{ width: 18, height: 13 }}
    />
  )
}

// ─── Single team row inside a card ────────────────────────────────────────────
function TeamRow({ name, score, winner, pending }: {
  name: string; score: number | null; winner: boolean; pending: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-2.5 py-[7px]',
      winner && !pending && 'bg-gradient-to-r from-amber-500/12 to-transparent',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {name
          ? <Flag team={name} />
          : <span className="inline-block w-[18px] h-[13px] rounded-sm bg-zinc-800 flex-shrink-0" />
        }
        <span className={cn(
          'text-[11px] truncate leading-tight',
          pending ? 'text-zinc-500'       :
          winner  ? 'text-white font-bold' :
                    'text-zinc-400',
        )}>
          {name || <span className="italic">Por definir</span>}
        </span>
      </div>
      {score !== null && !pending && (
        <span className={cn(
          'text-[11px] font-black tabular-nums flex-shrink-0',
          winner ? 'text-amber-400' : 'text-zinc-600',
        )}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div
        style={{ width: CARD_W }}
        className="h-[62px] rounded-xl border border-dashed border-zinc-600/40 bg-zinc-800/30 flex items-center justify-center shadow"
      >
        <span className="text-zinc-600 text-[10px]">Por definir</span>
      </div>
    )
  }

  const finished  = match.status === 'FINISHED'
  const live      = match.status === 'LIVE'
  const pending   = !finished && !live
  const homeWin   = finished && match.homeScore! > match.awayScore!
  const awayWin   = finished && match.awayScore! > match.homeScore!

  return (
    <div style={{ width: CARD_W }} className={cn(
      'rounded-xl border overflow-hidden shadow-lg',
      live     ? 'border-green-400/60 shadow-green-900/30' :
      finished ? 'border-zinc-600/70 shadow-black/40'      :
                 'border-zinc-600/40 shadow-black/30',
    )}>
      {live && (
        <div className="bg-green-500/20 flex items-center gap-1.5 px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">En vivo</span>
        </div>
      )}
      <div className="bg-zinc-800">
        <TeamRow name={match.homeTeam} score={match.homeScore} winner={homeWin} pending={pending} />
        <div className="border-t border-zinc-700/80 mx-2" />
        <TeamRow name={match.awayTeam} score={match.awayScore} winner={awayWin} pending={pending} />
      </div>
    </div>
  )
}

// ─── SVG connector column between two rounds ──────────────────────────────────
// fromCount = number of matches in the left stage
// slotH     = slot height of the LEFT stage
function BracketConnector({ fromCount, slotH }: { fromCount: number; slotH: number }) {
  const totalH  = fromCount * slotH
  const pairs   = fromCount / 2

  return (
    <svg
      width={CONN_W}
      height={totalH}
      className="flex-shrink-0"
      style={{ display: 'block' }}
    >
      {Array.from({ length: pairs }).map((_, i) => {
        const topY = i * slotH * 2 + slotH / 2   // center of upper match
        const botY = topY + slotH                  // center of lower match
        const midY = (topY + botY) / 2             // midpoint → next round center
        const vx   = CONN_W * 0.45                 // x of vertical bar

        return (
          <g key={i}>
            {/* Horizontal from upper match center-right */}
            <line x1={0}    y1={topY} x2={vx}     y2={topY} stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
            {/* Vertical bar connecting the two */}
            <line x1={vx}   y1={topY} x2={vx}     y2={botY} stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
            {/* Horizontal from lower match center-right */}
            <line x1={0}    y1={botY} x2={vx}     y2={botY} stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
            {/* Horizontal going right to next round */}
            <line x1={vx}   y1={midY} x2={CONN_W} y2={midY} stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlayoffsPage() {
  const { isLoading } = useProtected()
  const router = useRouter()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    Promise.all(
      [...STAGES.map((s) => s.key), 'THIRD_PLACE'].map((stage) =>
        matchApi.list({ stage })
      )
    )
      .then((res) => setAllMatches(res.flat()))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [isLoading])

  const byStage = (key: string): (Match | null)[] => {
    const ms = allMatches
      .filter((m) => m.stage === key)
      .sort((a, b) => {
        // Si ambos tienen bracketSlot, ordenar por él
        if (a.bracketSlot != null && b.bracketSlot != null) return a.bracketSlot - b.bracketSlot
        // Si solo uno tiene bracketSlot, ese va primero
        if (a.bracketSlot != null) return -1
        if (b.bracketSlot != null) return 1
        // Fallback: por fecha
        return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      })
    const stage = STAGES.find((s) => s.key === key)
    const slots: (Match | null)[] = [...ms]
    while (slots.length < (stage?.count ?? 0)) slots.push(null)
    return slots
  }

  const thirdPlace = allMatches.find((m) => m.stage === 'THIRD_PLACE')

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stadium">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stadium relative">
      {/* overlay para oscurecer el fondo tornasolado y dar contraste a las cards */}
      <div className="fixed inset-0 bg-zinc-950/60 pointer-events-none z-0" />
      <div className="relative z-10">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-zinc-950/96 backdrop-blur-md border-b border-white/8">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-zinc-800/70 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-[15px] leading-tight tracking-tight">
                Cuadro de Eliminatorias
              </h1>
              <p className="text-zinc-500 text-[10px] mt-0.5">Mundial 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bracket ── */}
      <div className="overflow-x-auto overflow-y-auto">
        <div className="px-4 pt-5 pb-8 min-w-max">

          {/* Stage labels row */}
          <div className="flex items-center mb-4 gap-0">
            {STAGES.map((s, si) => (
              <div key={s.key} className="flex items-center gap-0">
                <div style={{ width: CARD_W }} className="text-center">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.14em]">
                    {s.label}
                  </span>
                </div>
                {si < STAGES.length - 1 && (
                  <div style={{ width: CONN_W }} />
                )}
              </div>
            ))}
          </div>

          {/* Match + connector row */}
          <div className="flex items-start gap-0">
            {STAGES.map((stage, si) => {
              const slotH   = SLOT_H * Math.pow(2, si)
              const totalH  = stage.count * slotH
              const slots   = byStage(stage.key)
              const isLast  = si === STAGES.length - 1

              return (
                <div key={stage.key} className="flex items-start gap-0 flex-shrink-0">
                  {/* Match column */}
                  <div style={{ width: CARD_W, height: totalH }} className="flex flex-col flex-shrink-0">
                    {slots.map((m, i) => (
                      <div
                        key={m?.id ?? `empty-${stage.key}-${i}`}
                        style={{ height: slotH }}
                        className="flex items-center"
                      >
                        <MatchCard match={m} />
                      </div>
                    ))}
                  </div>

                  {/* Connector to next round */}
                  {!isLast && stage.count > 1 && (
                    <BracketConnector fromCount={stage.count} slotH={slotH} />
                  )}
                  {/* Last stage: no connector */}
                  {!isLast && stage.count === 1 && (
                    <div style={{ width: CONN_W }} />
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── 3er puesto ── */}
      {thirdPlace && (
        <div className="px-4 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              🥉 Tercer Puesto
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <div className="flex justify-center">
            <MatchCard match={thirdPlace} />
          </div>
        </div>
      )}

      </div> {/* end z-10 */}
    </div>
  )
}
