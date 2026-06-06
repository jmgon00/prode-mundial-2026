'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { adminApi, matchApi, StageStatus, Match, SyncResult, AdminFunBet } from '@/lib/api'
import { ArrowLeft, Lock, Unlock, CheckCircle, Circle, ChevronDown, ChevronUp, ShieldCheck, RefreshCw, Zap } from 'lucide-react'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage() {
  const { user, isLoading } = useProtected()
  const router = useRouter()

  const [stages, setStages] = useState<StageStatus[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [fetching, setFetching] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')
  const [expandedStage, setExpandedStage] = useState<string | null>('GROUP')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && user?.isAdmin) {
      Promise.all([adminApi.stages(), adminApi.matches(), adminApi.syncStatus()])
        .then(([s, m, sync]) => { setStages(s); setMatches(m); setSyncResult(sync) })
        .finally(() => setFetching(false))
    } else if (!isLoading) {
      setFetching(false)
    }
  }, [user, isLoading])

  async function handleClaim() {
    setClaimLoading(true)
    try {
      const { message, user: updatedUser } = await adminApi.claim()
      // Actualizar localStorage antes del reload para que isAdmin: true persista
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setClaimMsg(message)
      window.location.reload()
    } catch (err: any) {
      setClaimMsg(err.message)
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleSync() {
    setSyncLoading(true)
    try {
      const result = await adminApi.syncNow()
      setSyncResult(result)
      // Refrescar partidos para ver cambios de estado
      const [s, m] = await Promise.all([adminApi.stages(), adminApi.matches()])
      setStages(s)
      setMatches(m)
    } catch (err: any) {
      setSyncResult({ finished: 0, live: 0, errors: [err.message], timestamp: new Date().toISOString() })
    } finally {
      setSyncLoading(false)
    }
  }

  async function handleReset() {
    setResetLoading(true)
    setResetMsg('')
    try {
      const { message } = await adminApi.resetData()
      setResetMsg(message)
      setResetConfirm('')
      const [s, m] = await Promise.all([adminApi.stages(), adminApi.matches()])
      setStages(s)
      setMatches(m)
    } catch (err: any) {
      setResetMsg(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  async function toggleStage(stage: string, isUnlocked: boolean) {
    try {
      if (isUnlocked) {
        await adminApi.lockStage(stage)
      } else {
        await adminApi.unlockStage(stage)
      }
      const updated = await adminApi.stages()
      setStages(updated)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No es admin todavía — mostrar pantalla de claim
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7 text-sky-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Panel de Admin</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Si sos el primer usuario, podés reclamar el rol de administrador.
            </p>
          </div>
          {claimMsg && (
            <p className="text-sm text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
              {claimMsg}
            </p>
          )}
          <button
            onClick={handleClaim}
            disabled={claimLoading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {claimLoading ? 'Verificando...' : 'Reclamar rol de admin'}
          </button>
          <button onClick={() => router.back()} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
            Volver
          </button>
        </div>
      </div>
    )
  }

  const matchesByStage = (stage: string) => matches.filter((m) => m.stage === stage)

  return (
    <div className="min-h-screen bg-stadium">
      {/* Header */}
      <header className="border-b border-white/8 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-white text-sm">Panel de Administrador</h1>
            <p className="text-xs text-zinc-500">@{user.username}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs text-sky-400 font-medium">Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Sección: Setup inicial */}
        {stages.length === 0 && (
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div>
              <h2 className="text-white font-semibold">Setup inicial</h2>
              <p className="text-xs text-zinc-400 mt-0.5">La base de datos de producción está vacía. Cargá los partidos del Mundial para empezar.</p>
            </div>
            <SeedButton onDone={() => adminApi.stages().then(setStages)} />
          </section>
        )}

        {/* Sección: Etapas */}
        <section className="space-y-3">
          <div>
            <h2 className="text-white font-semibold">Gestión de etapas</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Controlá qué etapas están habilitadas para pronósticos</p>
          </div>

          <div className="space-y-2">
            {stages.map((s) => (
              <div key={s.stage} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Fila principal */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {s.isUnlocked
                    ? <Unlock className="h-4 w-4 text-sky-400 flex-shrink-0" />
                    : <Lock className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm', s.isUnlocked ? 'text-white' : 'text-zinc-500')}>
                      {STAGE_LABELS[s.stage]}
                    </p>
                    <p className="text-xs text-zinc-600">{s.total} partidos · {s.active} activos</p>
                  </div>
                  <button
                    onClick={() => toggleStage(s.stage, s.isUnlocked)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                      s.isUnlocked
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    )}
                  >
                    {s.isUnlocked ? 'Bloquear' : 'Desbloquear'}
                  </button>
                  <button
                    onClick={() => setExpandedStage(expandedStage === s.stage ? null : s.stage)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
                  >
                    {expandedStage === s.stage
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>

                {/* Partidos expandibles con carga de resultados */}
                {expandedStage === s.stage && (
                  <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                    {matchesByStage(s.stage).map((match) => (
                      <MatchResultRow
                        key={match.id}
                        match={match}
                        onSaved={(updated) =>
                          setMatches((prev) => prev.map((m) => m.id === updated.id ? updated : m))
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Sección: Sincronización automática */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold">Sincronización automática</h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                Trae resultados en tiempo real desde worldcup26.ir · Se ejecuta cada 3 min (solo fase de grupos)
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className="flex-shrink-0 flex items-center gap-1.5 bg-sky-700 hover:bg-sky-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncLoading && 'animate-spin')} />
              {syncLoading ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          </div>

          {syncResult && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-zinc-500">
                  Última sync: {new Date(syncResult.timestamp).toLocaleTimeString('es-AR')}
                </span>
                {syncResult.finished > 0 && (
                  <span className="text-sky-400 font-semibold">✓ {syncResult.finished} partido{syncResult.finished !== 1 ? 's' : ''} finalizado{syncResult.finished !== 1 ? 's' : ''}</span>
                )}
                {syncResult.live > 0 && (
                  <span className="text-red-400 font-semibold animate-pulse">● {syncResult.live} en vivo</span>
                )}
                {syncResult.finished === 0 && syncResult.live === 0 && syncResult.errors.length === 0 && (
                  <span className="text-zinc-600">Sin cambios</span>
                )}
              </div>
              {syncResult.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 space-y-1">
                  {syncResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sección: Reset de datos */}
        <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
          <div>
            <h2 className="text-white font-semibold">Resetear datos de prueba</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Borra todos los usuarios (excepto vos), ligas, pronósticos y badges. Los 104 partidos quedan intactos.
            </p>
          </div>
          <div className="space-y-2">
            <input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder='Escribí "resetear" para confirmar'
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500 outline-none"
            />
            <button
              onClick={handleReset}
              disabled={resetLoading || resetConfirm !== 'resetear'}
              className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {resetLoading ? 'Reseteando...' : 'Resetear todos los datos'}
            </button>
            {resetMsg && (
              <p className="text-sm text-zinc-400 text-center">{resetMsg}</p>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

function SeedButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSeed() {
    setLoading(true)
    try {
      const { message } = await adminApi.seedMatches()
      setMsg(message)
      onDone()
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
      >
        {loading ? 'Cargando partidos...' : '⚽ Cargar 104 partidos del Mundial 2026'}
      </button>
      {msg && <p className="text-sm text-zinc-400 text-center">{msg}</p>}
    </div>
  )
}

function MatchResultRow({ match, onSaved }: { match: Match; onSaved: (m: Match) => void }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? '')
  const [away, setAway] = useState(match.awayScore?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [editTeams, setEditTeams] = useState(false)
  const [homeTeam, setHomeTeam] = useState(match.homeTeam)
  const [awayTeam, setAwayTeam] = useState(match.awayTeam)
  const [showFunBets, setShowFunBets] = useState(false)
  const [funBets, setFunBets] = useState<AdminFunBet[] | null>(null)
  const [loadingFunBets, setLoadingFunBets] = useState(false)

  async function handleSaveResult() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a)) return
    setLoading(true)
    try {
      const updated = await adminApi.setResult(match.id, h, a)
      onSaved(updated)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTeams() {
    setLoading(true)
    try {
      const updated = await adminApi.setTeams(match.id, homeTeam, awayTeam)
      onSaved(updated)
      setEditTeams(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'LIVE'

  async function toggleFunBets() {
    if (funBets !== null) { setShowFunBets((v) => !v); return }
    setLoadingFunBets(true)
    try {
      const data = await adminApi.funBetsByMatch(match.id)
      setFunBets(data)
      setShowFunBets(true)
    } catch (err: any) { alert(err.message) }
    finally { setLoadingFunBets(false) }
  }

  async function handleAward(id: string) {
    try {
      await adminApi.awardFunBet(id)
      setFunBets((prev) => prev?.map((fb) => fb.id === id ? { ...fb, pointsEarned: 5 } : fb) ?? null)
    } catch (err: any) { alert(err.message) }
  }

  async function handleRevoke(id: string) {
    try {
      await adminApi.revokeFunBet(id)
      setFunBets((prev) => prev?.map((fb) => fb.id === id ? { ...fb, pointsEarned: null } : fb) ?? null)
    } catch (err: any) { alert(err.message) }
  }

  async function handleSetStatus(status: 'LIVE' | 'SCHEDULED') {
    setLoading(true)
    try {
      const updated = await adminApi.setStatus(match.id, status)
      onSaved(updated)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{formatDate(match.matchDate)}</span>
        <div className="flex items-center gap-2">
          {isFinished && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-xs font-medium text-sky-400">Finalizado</span>
            </div>
          )}
          {isLive && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-red-400 animate-pulse">● EN VIVO</span>
              <button
                onClick={() => handleSetStatus('SCHEDULED')}
                disabled={loading}
                className="text-xs text-zinc-600 hover:text-zinc-400 underline transition-colors"
              >
                deshacer
              </button>
            </div>
          )}
          {!isFinished && !isLive && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Circle className="h-3.5 w-3.5 text-zinc-600" />
                <span className="text-xs font-medium text-zinc-600">Pendiente</span>
              </div>
              <button
                onClick={() => handleSetStatus('LIVE')}
                disabled={loading}
                className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 font-semibold px-2 py-0.5 rounded-md transition-colors disabled:opacity-40"
              >
                ● En vivo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Equipos editables */}
      {editTeams ? (
        <div className="flex items-center gap-2">
          <input
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-right"
          />
          <span className="text-zinc-600 text-xs font-bold">vs</span>
          <input
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
          />
          <button onClick={handleSaveTeams} disabled={loading} className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded-lg font-medium transition-all disabled:opacity-50">
            Guardar
          </button>
          <button onClick={() => setEditTeams(false)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-right text-sm font-semibold text-white truncate">{match.homeTeam}</span>
          <span className="text-zinc-600 text-xs font-bold">vs</span>
          <span className="flex-1 text-sm font-semibold text-white truncate">{match.awayTeam}</span>
          {match.stage !== 'GROUP' && (
            <button onClick={() => setEditTeams(true)} className="text-xs text-zinc-600 hover:text-zinc-400 underline transition-colors">
              editar
            </button>
          )}
        </div>
      )}

      {/* Carga de resultado */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={home}
          onChange={(e) => setHome(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="–"
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-sm font-bold text-white py-1.5 focus:border-sky-500 outline-none"
        />
        <span className="text-zinc-600 font-bold text-sm">–</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={away}
          onChange={(e) => setAway(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="–"
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-sm font-bold text-white py-1.5 focus:border-sky-500 outline-none"
        />
        <button
          onClick={handleSaveResult}
          disabled={loading || home === '' || away === ''}
          className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
        >
          {loading ? '...' : isFinished ? 'Actualizar' : 'Cargar resultado'}
        </button>
      </div>

      {/* Apuestas locas */}
      {isFinished && (
        <div className="border-t border-zinc-800/50 pt-2">
          <button
            onClick={toggleFunBets}
            disabled={loadingFunBets}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <Zap className="h-3 w-3" />
            {loadingFunBets ? 'Cargando...' : showFunBets ? 'Ocultar apuestas locas' : 'Ver apuestas locas'}
          </button>

          {showFunBets && funBets && (
            <div className="mt-2 space-y-1.5">
              {funBets.length === 0 ? (
                <p className="text-xs text-zinc-600">Nadie apostó en este partido</p>
              ) : (
                funBets.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-2 bg-zinc-800/40 rounded-lg px-3 py-2">
                    <span className="text-sm leading-none flex-shrink-0">{fb.avatarUrl ?? '🎲'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-zinc-300">{fb.username}</span>
                      <span className="text-xs text-zinc-600 ml-1">· {fb.leagueName}</span>
                      <p className="text-xs text-zinc-400 italic mt-0.5">"{fb.prediction}"</p>
                    </div>
                    {fb.pointsEarned !== null ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold text-sky-400">+{fb.pointsEarned} pts</span>
                        <button
                          onClick={() => handleRevoke(fb.id)}
                          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAward(fb.id)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 px-2 py-1 rounded-lg transition-all"
                      >
                        <Zap className="h-3 w-3" />
                        +5 pts
                      </button>
                    )}
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
