'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { leagueApi, matchApi, predictionApi, rankingApi, badgeApi, statsApi, funBetsApi, BADGE_META } from '@/lib/api'
import type { League, Match, Prediction, RankingEntry, BadgeEntry, Penalty, VerdictEntry, MatchPrediction, UserStats, FunBet, FunBetReveal } from '@/lib/api'
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
  const [stats, setStats] = useState<UserStats | null>(null)
  const [funBets, setFunBets] = useState<Map<string, FunBet>>(new Map())

  useEffect(() => {
    if (!isLoading && user) {
      Promise.all([
        leagueApi.get(id),
        matchApi.list(),
        predictionApi.listByLeague(id),
        rankingApi.get(id),
        badgeApi.listByLeague(id),
        statsApi.league(id),
        funBetsApi.listByLeague(id),
      ]).then(([l, m, preds, r, b, s, fb]) => {
        setLeague(l)
        setMatches(m)
        setPredictions(new Map(preds.map((p) => [p.matchId, p])))
        setRanking(r)
        setBadges(b)
        setStats(s)
        setFunBets(new Map(fb.map((f) => [f.matchId, f])))
      }).finally(() => setFetching(false))
    }
  }, [user, isLoading, id])

  function handleShare() {
    if (!stats || !league) return
    const text = `Estoy en el puesto ${stats.rank}° con ${stats.totalPoints} pts en la liga "${league.name}" del Prode Mundial 2026 ⚽🏆\nUníte con el código: ${league.inviteCode}\n${window.location.origin}`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  async function saveFunBet(matchId: string, prediction: string) {
    try {
      const fb = await funBetsApi.upsert({ matchId, leagueId: id, prediction })
      setFunBets((prev) => new Map(prev).set(matchId, fb))
    } catch { /* silently ignore */ }
  }

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
    <div className="min-h-screen bg-stadium">
      {/* Header */}
      <header className="border-b border-white/8 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
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
          <div className="max-w-lg mx-auto px-4 py-4 space-y-6 pb-safe">
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
                          <MatchCard key={match.id} match={match} prediction={predictions.get(match.id)} onSave={savePrediction} leagueId={id} currentUserId={user!.id} funBet={funBets.get(match.id)} onSaveFunBet={saveFunBet} />
                        ))}
                      </div>
                    ))
                  ) : (
                    stageMatches.map((match) => (
                      <MatchCard key={match.id} match={match} prediction={predictions.get(match.id)} onSave={savePrediction} leagueId={id} currentUserId={user!.id} funBet={funBets.get(match.id)} onSaveFunBet={saveFunBet} />
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Ranking */}
        <TabsContent value="ranking" className="mt-0">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-safe">

            {/* Stats personales */}
            {stats && (
              <div className="bg-zinc-900/70 border border-white/8 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Tus stats</p>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all"
                  >
                    📲 Compartir
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stats.rank}°</span>
                  <span className="text-zinc-500 text-sm">de {stats.totalMembers}</span>
                  <span className="text-amber-400 font-bold ml-auto">{stats.totalPoints} pts</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-2">
                    <p className="text-base">🎯</p>
                    <p className="text-emerald-400 font-bold text-sm">{stats.exact}</p>
                    <p className="text-zinc-500 text-xs">exactos</p>
                  </div>
                  <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg p-2">
                    <p className="text-base">✅</p>
                    <p className="text-blue-400 font-bold text-sm">{stats.accuracy}%</p>
                    <p className="text-zinc-500 text-xs">aciertos</p>
                  </div>
                  <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg p-2">
                    <p className="text-base">🔥</p>
                    <p className="text-amber-400 font-bold text-sm">{stats.bestStreak}</p>
                    <p className="text-zinc-500 text-xs">racha</p>
                  </div>
                  <div className="bg-zinc-800/50 border border-white/6 rounded-lg p-2">
                    <p className="text-base">📝</p>
                    <p className="text-zinc-300 font-bold text-sm">{stats.predictionsCount}</p>
                    <p className="text-zinc-500 text-xs">pronóst.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista ranking */}
            {ranking.length === 0 ? (
              <div className="text-center py-16">
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
                      idx === 0 && 'bg-amber-500/8 border-amber-400/40 shadow-md shadow-amber-900/25',
                      idx === 1 && 'bg-slate-400/5 border-slate-400/30 shadow-sm shadow-slate-900/20',
                      idx === 2 && 'bg-orange-600/5 border-orange-600/30',
                      idx > 2 && 'bg-zinc-900/60 border-white/6',
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl w-8 text-center flex-shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                          <span className="text-sm font-bold text-zinc-500">{idx + 1}</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {entry.avatarUrl && <span className="text-base leading-none">{entry.avatarUrl}</span>}
                          <p className="font-semibold text-white text-sm truncate">{entry.username}</p>
                          {entry.userId === user?.id && <span className="text-xs text-zinc-600">(vos)</span>}
                        </div>
                        {entry.role === 'OWNER' && (
                          <p className="text-xs text-emerald-500 mt-0.5">Organizador</p>
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

function useCountdown(targetDate: string) {
  const getState = () => {
    const diff = new Date(targetDate).getTime() - Date.now()
    if (diff <= 0) return { label: '', urgency: 'ok' as const }
    const totalMin = Math.floor(diff / 60_000)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    const days = Math.floor(hours / 24)
    const remH = hours % 24
    if (days >= 1) return { label: `${days}d ${remH}h`, urgency: 'ok' as const }
    if (hours >= 1) return { label: `${hours}h ${mins}m`, urgency: 'soon' as const }
    return { label: `${mins}m`, urgency: 'urgent' as const }
  }
  const [state, setState] = useState(getState)
  useEffect(() => {
    const id = setInterval(() => setState(getState()), 30_000)
    return () => clearInterval(id)
  }, [targetDate])
  return state
}

function MatchCard({
  match, prediction, onSave, leagueId, currentUserId, funBet, onSaveFunBet,
}: {
  match: Match
  prediction?: Prediction
  onSave: (matchId: string, home: number, away: number) => void
  leagueId: string
  currentUserId: string
  funBet?: FunBet
  onSaveFunBet: (matchId: string, prediction: string) => void
}) {
  const [home, setHome] = useState(prediction?.predictedHomeScore?.toString() ?? '')
  const [away, setAway] = useState(prediction?.predictedAwayScore?.toString() ?? '')
  const canPredict = match.status === 'SCHEDULED' && new Date() < new Date(match.matchDate)
  const { label: countdown, urgency } = useCountdown(match.matchDate)
  const [showRivals, setShowRivals] = useState(false)
  const [rivals, setRivals] = useState<MatchPrediction[] | null>(null)
  const [loadingRivals, setLoadingRivals] = useState(false)
  const [funBetText, setFunBetText] = useState(funBet?.prediction ?? '')
  const [funBetSaved, setFunBetSaved] = useState(!!funBet)
  const [savingFunBet, setSavingFunBet] = useState(false)
  const [showFunBetReveals, setShowFunBetReveals] = useState(false)
  const [funBetReveals, setFunBetReveals] = useState<FunBetReveal[] | null>(null)
  const [loadingFunBetReveals, setLoadingFunBetReveals] = useState(false)

  async function handleSaveFunBet() {
    if (!funBetText.trim()) return
    setSavingFunBet(true)
    try {
      await onSaveFunBet(match.id, funBetText.trim())
      setFunBetSaved(true)
    } catch { /* silently ignore */ }
    finally { setSavingFunBet(false) }
  }

  async function toggleFunBetReveals() {
    if (funBetReveals !== null) { setShowFunBetReveals((v) => !v); return }
    setLoadingFunBetReveals(true)
    try {
      const data = await funBetsApi.byMatch(match.id, leagueId)
      setFunBetReveals(data)
      setShowFunBetReveals(true)
    } catch { /* silently ignore */ }
    finally { setLoadingFunBetReveals(false) }
  }

  async function toggleRivals() {
    if (rivals !== null) { setShowRivals((v) => !v); return }
    setLoadingRivals(true)
    try {
      const data = await predictionApi.byMatch(match.id, leagueId)
      setRivals(data)
      setShowRivals(true)
    } catch { /* silently ignore */ }
    finally { setLoadingRivals(false) }
  }

  function handleBlur() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (!isNaN(h) && !isNaN(a)) onSave(match.id, h, a)
  }

  const pts = prediction?.pointsEarned
  const hasPrediction = prediction !== undefined

  return (
    <div className={cn(
      'rounded-xl overflow-hidden transition-all',
      match.status === 'FINISHED' && 'bg-zinc-900/60 border border-white/6',
      match.status === 'LIVE'     && 'bg-zinc-900/70 border border-red-500/40 shadow-md shadow-red-900/20',
      match.status === 'SCHEDULED' && 'bg-zinc-900/70 border border-white/8 hover:border-emerald-500/25 hover:shadow-md hover:shadow-emerald-900/15',
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
        {match.status === 'SCHEDULED' && canPredict && countdown && (
          <span className={cn(
            'text-xs font-mono font-medium',
            urgency === 'ok'     && 'text-emerald-500',
            urgency === 'soon'   && 'text-amber-400',
            urgency === 'urgent' && 'text-red-400 animate-pulse',
          )}>
            ⏱ {countdown}
          </span>
        )}
        {match.status === 'SCHEDULED' && !canPredict && (
          <span className="text-xs text-amber-600 font-medium">Cerrado</span>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={home}
                onChange={(e) => setHome(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={handleBlur}
                disabled={!canPredict}
                className="w-12 h-10 text-center p-0 text-base font-bold bg-zinc-800 border-zinc-700 focus:border-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="–"
              />
              <span className="text-zinc-600 font-bold text-sm">:</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={away}
                onChange={(e) => setAway(e.target.value.replace(/\D/g, '').slice(0, 2))}
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

      {/* Apuesta loca */}
      <div className="border-t border-white/5 px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">🎲 Apuesta loca</p>
        {canPredict ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={funBetText}
              onChange={(e) => { setFunBetText(e.target.value); setFunBetSaved(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFunBet() }}
              placeholder="Ej: habrá 3 expulsados, habrá penal..."
              maxLength={300}
              className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none transition-colors"
            />
            <button
              onClick={handleSaveFunBet}
              disabled={savingFunBet || !funBetText.trim()}
              className={cn(
                'flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40',
                funBetSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600/50',
              )}
            >
              {savingFunBet ? '...' : funBetSaved ? '✓' : 'Guardar'}
            </button>
          </div>
        ) : funBetText ? (
          <p className="text-xs text-zinc-400 italic">"{funBetText}"</p>
        ) : (
          <p className="text-xs text-zinc-600 italic">No apostaste nada raro</p>
        )}
      </div>

      {/* Panel apuestas locas de todos (solo cuando FINISHED) */}
      {match.status === 'FINISHED' && (
        <div className="border-t border-white/5">
          <button
            onClick={toggleFunBetReveals}
            disabled={loadingFunBetReveals}
            className="w-full text-xs text-purple-500/70 hover:text-purple-400 py-2 flex items-center justify-center gap-1.5 transition-colors"
          >
            {loadingFunBetReveals ? 'Cargando...' : showFunBetReveals ? '▲ Ocultar apuestas locas' : '🎲 Ver apuestas locas de todos'}
          </button>
          {showFunBetReveals && funBetReveals && (
            <div className="pb-3 px-3 space-y-1.5">
              {funBetReveals.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-2">Nadie apostó nada raro</p>
              ) : (
                funBetReveals.map((fb) => (
                  <div key={fb.userId} className={cn(
                    'flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs',
                    fb.userId === currentUserId ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/3',
                  )}>
                    <span className="text-base leading-none flex-shrink-0">{fb.avatarUrl ?? '🎲'}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn('font-semibold', fb.userId === currentUserId ? 'text-purple-300' : 'text-zinc-300')}>
                        {fb.username}{fb.userId === currentUserId && <span className="text-zinc-500 font-normal ml-1">(vos)</span>}
                      </span>
                      <p className="text-zinc-400 mt-0.5 italic">"{fb.prediction}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Panel pronósticos de rivales */}
      {match.status === 'FINISHED' && (
        <div className="border-t border-white/5">
          <button
            onClick={toggleRivals}
            disabled={loadingRivals}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-2 flex items-center justify-center gap-1.5 transition-colors"
          >
            {loadingRivals
              ? 'Cargando...'
              : showRivals
              ? '▲ Ocultar pronósticos'
              : '▼ Ver pronósticos de todos'}
          </button>

          {showRivals && rivals && (
            <div className="pb-3 px-3 space-y-1">
              {rivals.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-2">Nadie pronosticó este partido</p>
              ) : (
                rivals.map((r, i) => (
                  <div key={r.userId} className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs',
                    r.userId === currentUserId
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-white/3',
                  )}>
                    <span className="w-5 flex-shrink-0 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-zinc-600">{i + 1}</span>}
                    </span>
                    <span className={cn('flex-1 font-medium truncate', r.userId === currentUserId ? 'text-emerald-300' : 'text-zinc-300')}>
                      {r.username}
                      {r.userId === currentUserId && <span className="text-zinc-500 font-normal ml-1">(vos)</span>}
                    </span>
                    <span className="font-mono text-zinc-400 flex-shrink-0">
                      {r.predictedHomeScore} – {r.predictedAwayScore}
                    </span>
                    <span className={cn(
                      'font-bold flex-shrink-0 w-12 text-right',
                      r.pointsEarned === 3 && 'text-emerald-400',
                      r.pointsEarned === 2 && 'text-blue-400',
                      r.pointsEarned === 1 && 'text-amber-400',
                      r.pointsEarned === 0 && 'text-zinc-600',
                    )}>
                      {r.pointsEarned > 0 ? `+${r.pointsEarned}` : '0'} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
