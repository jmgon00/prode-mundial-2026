'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { leagueApi, matchApi, predictionApi, rankingApi, badgeApi, BADGE_META } from '@/lib/api'
import type { League, Match, Prediction, RankingEntry, BadgeEntry, Penalty, VerdictEntry } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Copy, Check, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Fase de grupos',
  ROUND_OF_32: 'Ronda de 32',
  ROUND_OF_16: 'Octavos de final',
  QUARTERFINAL: 'Cuartos de final',
  SEMIFINAL: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
}

const STAGE_ORDER = ['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isLoading } = useProtected()
  const router = useRouter()

  const [league, setLeague] = useState<League | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map())
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [badges, setBadges] = useState<BadgeEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      Promise.all([
        leagueApi.get(id),
        matchApi.list(),
        predictionApi.listByLeague(id),
        rankingApi.get(id),
        badgeApi.listByLeague(id),
      ]).then(([l, m, preds, r, b]) => {
        setLeague(l)
        setMatches(m)
        setPredictions(new Map(preds.map((p) => [p.matchId, p])))
        setRanking(r)
        setBadges(b)
      }).finally(() => setFetching(false))
    }
  }, [user, isLoading, id])

  async function savePrediction(matchId: string, home: number, away: number) {
    try {
      const pred = await predictionApi.upsert({ matchId, leagueId: id, predictedHomeScore: home, predictedAwayScore: away })
      setPredictions((prev) => new Map(prev).set(matchId, pred))
    } catch { /* silently ignore */ }
  }

  function copyCode() {
    if (!league) return
    if (navigator.share) {
      navigator.share({
        title: `Unite a ${league.name}`,
        text: `Te invito al Prode Mundial 22Recortada. Usá el código: ${league.inviteCode}`,
        url: window.location.origin,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(league.inviteCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!league) return null

  // Agrupar partidos por stage; dentro de GROUP, sub-agrupar por group
  const matchesByStage = STAGE_ORDER.reduce<Record<string, Match[]>>((acc, stage) => {
    const group = matches.filter((m) => m.stage === stage)
    if (group.length > 0) acc[stage] = group
    return acc
  }, {})

  const groupsByLetter = ['A','B','C','D','E','F','G','H','I','J','K','L'].reduce<Record<string, Match[]>>((acc, g) => {
    const ms = (matchesByStage['GROUP'] ?? []).filter((m) => m.group === g)
    if (ms.length > 0) acc[g] = ms
    return acc
  }, {})

  const scheduledCount = matches.filter((m) => m.status === 'SCHEDULED').length
  const finishedCount = matches.filter((m) => m.status === 'FINISHED').length

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white truncate text-sm">{league.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {league.members?.length ?? 0} miembros
              </span>
            </div>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-zinc-300 transition-colors"
          >
            {codeCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {league.inviteCode}
          </button>
        </div>
      </header>

      <Tabs defaultValue="matches" className="flex flex-col">
        <div className="max-w-lg mx-auto w-full px-4">
          <TabsList className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mt-4 h-auto">
            <TabsTrigger value="matches" className="flex-1 rounded-lg text-sm py-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 transition-all">
              Partidos
              {scheduledCount > 0 && <span className="ml-1.5 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono">{scheduledCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1 rounded-lg text-sm py-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 transition-all">
              Ranking
              {ranking.length > 0 && <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono">{ranking.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="penalties" className="flex-1 rounded-lg text-sm py-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 transition-all">
              Penitencias
              {league.penalties?.length > 0 && <span className="ml-1.5 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-mono">{league.penalties.length}</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Partidos */}
        <TabsContent value="matches" className="mt-0">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
            {matches.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-zinc-400">Aún no hay partidos cargados</p>
              </div>
            ) : (
              Object.entries(matchesByStage).map(([stage, stageMatches]) => (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide',
                      stage === 'GROUP'        && 'bg-emerald-500/15 text-emerald-400',
                      stage === 'ROUND_OF_32'  && 'bg-blue-500/15 text-blue-400',
                      stage === 'ROUND_OF_16'  && 'bg-violet-500/15 text-violet-400',
                      stage === 'QUARTERFINAL' && 'bg-orange-500/15 text-orange-400',
                      stage === 'SEMIFINAL'    && 'bg-amber-500/15 text-amber-400',
                      stage === 'THIRD_PLACE'  && 'bg-zinc-500/15 text-zinc-400',
                      stage === 'FINAL'        && 'bg-yellow-500/15 text-yellow-400',
                    )}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="text-xs text-zinc-600">{stageMatches.length} partidos</span>
                  </div>

                  {stage === 'GROUP' ? (
                    Object.entries(groupsByLetter).map(([letter, groupMatches]) => (
                      <div key={letter} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-xs font-bold text-zinc-400">{letter}</span>
                          </div>
                          <span className="text-xs text-zinc-600">Grupo {letter}</span>
                        </div>
                        {groupMatches.map((match) => (
                          <MatchCard key={match.id} match={match} prediction={predictions.get(match.id)} onSave={savePrediction} />
                        ))}
                      </div>
                    ))
                  ) : (
                    stageMatches.map((match) => (
                      <MatchCard key={match.id} match={match} prediction={predictions.get(match.id)} onSave={savePrediction} />
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Ranking */}
        <TabsContent value="ranking" className="mt-0">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
            {ranking.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🏆</p>
                <p className="text-zinc-400">El ranking aparece cuando haya partidos finalizados</p>
              </div>
            ) : (
              ranking.map((entry, idx) => {
                const userBadges = badges.filter((b) => b.userId === entry.userId)
                const uniqueTypes = [...new Set(userBadges.map((b) => b.type))]
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      'rounded-xl border transition-all',
                      idx === 0 && 'bg-amber-500/5 border-amber-500/30',
                      idx === 1 && 'bg-zinc-400/5 border-zinc-600/30',
                      idx === 2 && 'bg-orange-500/5 border-orange-700/30',
                      idx > 2 && 'bg-zinc-900 border-zinc-800',
                    )}
                  >
                    <div className="flex items-center gap-4 px-4 py-3">
                      <span className="text-xl w-8 text-center flex-shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                          <span className="text-sm font-bold text-zinc-500">{idx + 1}</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{entry.username}</p>
                        {entry.role === 'OWNER' && (
                          <p className="text-xs text-emerald-500">Organizador</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        <span className={cn(
                          'font-bold text-sm',
                          idx === 0 && 'text-amber-400',
                          idx > 0 && 'text-zinc-300',
                        )}>
                          {entry.totalPoints} pts
                        </span>
                      </div>
                    </div>
                    {uniqueTypes.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {uniqueTypes.map((type) => {
                          const count = userBadges.filter((b) => b.type === type).length
                          const meta = BADGE_META[type]
                          return (
                            <span key={type} title={meta?.label}
                              className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full text-zinc-300"
                            >
                              {meta?.emoji}
                              <span className="text-zinc-400">{meta?.label}</span>
                              {count > 1 && <span className="text-zinc-600 font-mono">×{count}</span>}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Tab Penitencias */}
        <TabsContent value="penalties" className="mt-0">
          <PenaltiesTab league={league} userId={user!.id} onUpdate={setLeague} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PenaltiesTab({ league, userId, onUpdate }: { league: League; userId: string; onUpdate: (l: League) => void }) {
  const [newReward, setNewReward] = useState('')
  const [newPenalty, setNewPenalty] = useState('')
  const [loading, setLoading] = useState(false)
  const [verdict, setVerdict] = useState<VerdictEntry[] | null>(null)
  const [loadingVerdict, setLoadingVerdict] = useState(false)
  const isOwner = league.ownerId === userId

  const allItems = league.penalties ?? []
  const rewards  = [...allItems.filter(p => (p as any).type === 'REWARD')].sort((a, b) => a.position - b.position)
  const penalties = [...allItems.filter(p => (p as any).type !== 'REWARD')].sort((a, b) => a.position - b.position)

  useEffect(() => {
    if (allItems.length > 0) {
      setLoadingVerdict(true)
      rankingApi.verdict(league.id)
        .then((r) => setVerdict(r.verdict))
        .catch(() => {})
        .finally(() => setLoadingVerdict(false))
    }
  }, [league.id, allItems.length])

  async function handleAdd(type: 'REWARD' | 'PENALTY') {
    const desc = type === 'REWARD' ? newReward : newPenalty
    if (!desc.trim()) return
    setLoading(true)
    try {
      const sameType = allItems.filter(p => (p as any).type === type)
      const position = sameType.length + 1
      const item = await leagueApi.addPenalty(league.id, { description: desc.trim(), position, type })
      onUpdate({ ...league, penalties: [...allItems, item] })
      type === 'REWARD' ? setNewReward('') : setNewPenalty('')
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(penaltyId: string, type: 'REWARD' | 'PENALTY') {
    setLoading(true)
    try {
      await leagueApi.deletePenalty(league.id, penaltyId)
      const updated = allItems
        .filter((p) => p.id !== penaltyId)
        .map((p, _, arr) => {
          const sameType = arr.filter(x => (x as any).type === (p as any).type)
          return { ...p, position: sameType.indexOf(p) + 1 }
        })
      onUpdate({ ...league, penalties: updated })
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  const rewardLabels = ['Campeón', '2° puesto', '3° puesto']
  const penaltyLabels = ['Último', 'Anteúltimo', '3° desde abajo']

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-6">

      {/* Veredicto final */}
      {allItems.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-white font-semibold">Veredicto final</p>
            <p className="text-xs text-zinc-500 mt-0.5">Ranking actual con premios y penitencias asignados</p>
          </div>
          {loadingVerdict ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : verdict ? (
            <div className="space-y-2">
              {verdict.map((v, i) => (
                <div key={v.userId} className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 border',
                  v.reward && 'bg-amber-500/5 border-amber-500/20',
                  v.penalty && 'bg-red-500/5 border-red-500/20',
                  !v.reward && !v.penalty && 'bg-zinc-900 border-zinc-800',
                )}>
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{v.username}</p>
                    {v.reward  && <p className="text-xs text-amber-400 mt-0.5">🏆 {v.reward}</p>}
                    {v.penalty && <p className="text-xs text-red-400 mt-0.5">🥄 {v.penalty}</p>}
                    {!v.reward && !v.penalty && <p className="text-xs text-zinc-600 mt-0.5">Sin premio ni penitencia</p>}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">{v.totalPoints} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-zinc-500 text-sm">Cargá resultados para ver el veredicto</p>
            </div>
          )}
        </div>
      )}

      {/* Premios */}
      <div className="space-y-3">
        <div>
          <p className="text-white font-semibold">🏆 Premios</p>
          <p className="text-xs text-zinc-500 mt-0.5">El 1° que agregues es para el campeón, el 2° para el segundo, etc.</p>
        </div>
        {rewards.length === 0 ? (
          <div className="text-center py-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-sm">Sin premios configurados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="w-10 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">{rewardLabels[i] ?? `${i + 1}° puesto`}</p>
                  <p className="text-sm text-zinc-200">{r.description}</p>
                </div>
                {isOwner && <button onClick={() => handleDelete(r.id, 'REWARD')} disabled={loading} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>}
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="flex gap-2">
            <Input
              placeholder={`Premio para el ${rewardLabels[rewards.length] ?? `${rewards.length + 1}° puesto`}`}
              value={newReward}
              onChange={(e) => setNewReward(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd('REWARD') } }}
              className="bg-zinc-800 border-zinc-700 focus:border-amber-500 text-white placeholder:text-zinc-500 h-10 text-sm"
            />
            <button onClick={() => handleAdd('REWARD')} disabled={loading || !newReward.trim()}
              className="flex-shrink-0 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 rounded-xl transition-all disabled:opacity-40">
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* Penitencias */}
      <div className="space-y-3">
        <div>
          <p className="text-white font-semibold">🥄 Penitencias</p>
          <p className="text-xs text-zinc-500 mt-0.5">El 1° que agregues es para el último, el 2° para el anteúltimo, etc.</p>
        </div>
        {penalties.length === 0 ? (
          <div className="text-center py-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-sm">Sin penitencias configuradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {penalties.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="w-10 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-red-400">{i === 0 ? 'ÚLT' : i === 1 ? 'ANT' : `·${i + 1}`}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">{penaltyLabels[i] ?? `${i + 1}° desde abajo`}</p>
                  <p className="text-sm text-zinc-200">{p.description}</p>
                </div>
                {isOwner && <button onClick={() => handleDelete(p.id, 'PENALTY')} disabled={loading} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>}
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="flex gap-2">
            <Input
              placeholder={`Penitencia para el ${penaltyLabels[penalties.length] ?? `${penalties.length + 1}° desde abajo`}`}
              value={newPenalty}
              onChange={(e) => setNewPenalty(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd('PENALTY') } }}
              className="bg-zinc-800 border-zinc-700 focus:border-red-500 text-white placeholder:text-zinc-500 h-10 text-sm"
            />
            <button onClick={() => handleAdd('PENALTY')} disabled={loading || !newPenalty.trim()}
              className="flex-shrink-0 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-4 rounded-xl transition-all disabled:opacity-40">
              Agregar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  prediction,
  onSave,
}: {
  match: Match
  prediction?: Prediction
  onSave: (matchId: string, home: number, away: number) => void
}) {
  const [home, setHome] = useState(prediction?.predictedHomeScore?.toString() ?? '')
  const [away, setAway] = useState(prediction?.predictedAwayScore?.toString() ?? '')
  const canPredict = match.status === 'SCHEDULED' && new Date() < new Date(match.matchDate)

  function handleBlur() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (!isNaN(h) && !isNaN(a)) onSave(match.id, h, a)
  }

  const pts = prediction?.pointsEarned
  const hasPrediction = prediction !== undefined

  return (
    <div className={cn(
      'bg-zinc-900 border rounded-xl overflow-hidden transition-all',
      match.status === 'FINISHED' ? 'border-zinc-800' : 'border-zinc-800 hover:border-zinc-700',
    )}>
      {/* Header de la tarjeta */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-500">{formatDate(match.matchDate)}</span>
        {match.status === 'FINISHED' && (
          <span className="text-xs text-zinc-600 uppercase tracking-wide font-medium">Finalizado</span>
        )}
        {match.status === 'LIVE' && (
          <span className="text-xs text-red-400 uppercase tracking-wide font-semibold animate-pulse">En vivo</span>
        )}
        {match.status === 'SCHEDULED' && (
          <span className="text-xs text-zinc-600">Programado</span>
        )}
      </div>

      {/* Contenido principal */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Equipo local */}
          <span className="flex-1 text-right font-semibold text-sm text-white truncate">
            {match.homeTeam}
          </span>

          {/* Marcador / Inputs */}
          {match.status === 'FINISHED' ? (
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-1.5 flex-shrink-0">
              <span className="font-bold text-lg text-white w-5 text-center">{match.homeScore}</span>
              <span className="text-zinc-600 font-bold">–</span>
              <span className="font-bold text-lg text-white w-5 text-center">{match.awayScore}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Input
                type="number"
                min="0"
                max="99"
                value={home}
                onChange={(e) => setHome(e.target.value)}
                onBlur={handleBlur}
                disabled={!canPredict}
                className="w-12 h-10 text-center p-0 text-base font-bold bg-zinc-800 border-zinc-700 focus:border-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="–"
              />
              <span className="text-zinc-600 font-bold text-sm">:</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={away}
                onChange={(e) => setAway(e.target.value)}
                onBlur={handleBlur}
                disabled={!canPredict}
                className="w-12 h-10 text-center p-0 text-base font-bold bg-zinc-800 border-zinc-700 focus:border-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="–"
              />
            </div>
          )}

          {/* Equipo visitante */}
          <span className="flex-1 font-semibold text-sm text-white truncate">
            {match.awayTeam}
          </span>
        </div>

        {/* Resultado del pronóstico */}
        {hasPrediction && match.status === 'FINISHED' && (
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <span className="text-xs text-zinc-500">
              Tu pronóstico: {prediction.predictedHomeScore} – {prediction.predictedAwayScore}
            </span>
            {pts !== null && pts !== undefined && (
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                pts === 3 && 'bg-emerald-500/20 text-emerald-400',
                pts === 2 && 'bg-blue-500/20 text-blue-400',
                pts === 1 && 'bg-yellow-500/20 text-yellow-400',
                pts === 0 && 'bg-zinc-700/50 text-zinc-500',
              )}>
                {pts > 0 ? `+${pts} pts` : '0 pts'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
