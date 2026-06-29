'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { adminApi, matchApi, StageStatus, Match, SyncResult, AdminFunBet, FunBetCategory, funBetsApi, Report } from '@/lib/api'
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

        {/* Sección: Gestión de usuarios */}
        <UserManagementSection />

        {/* Sección: Pronóstico retroactivo */}
        <RetroactivePredictionSection />

        {/* Sección: Reportes de usuarios */}
        <ReportsSection />

        {/* Sección: Activar Fase 2 */}
        <Phase2Section />

        {/* Sección: Notificación de prueba */}
        <TestPushSection />

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
  const [autoValidating, setAutoValidating] = useState(false)
  const [autoValidateResult, setAutoValidateResult] = useState<{ awarded: number; notOccurred: number; skipped: number; errors: string[] } | null>(null)
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualUsers, setManualUsers] = useState<{ id: string; username: string }[]>([])
  const [manualLeagues, setManualLeagues] = useState<{ id: string; name: string }[]>([])
  const [manualCategories, setManualCategories] = useState<FunBetCategory[]>([])
  const [manualUserId, setManualUserId] = useState('')
  const [manualLeagueId, setManualLeagueId] = useState('')
  const [manualCategoryId, setManualCategoryId] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

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
      const { pointsEarned } = await adminApi.awardFunBet(id)
      setFunBets((prev) => prev?.map((fb) => fb.id === id ? { ...fb, pointsEarned } : fb) ?? null)
    } catch (err: any) { alert(err.message) }
  }

  async function handleRevoke(id: string) {
    try {
      await adminApi.revokeFunBet(id)
      setFunBets((prev) => prev?.map((fb) => fb.id === id ? { ...fb, pointsEarned: null } : fb) ?? null)
    } catch (err: any) { alert(err.message) }
  }

  async function openManualForm() {
    if (!showManualForm && manualUsers.length === 0) {
      try {
        const [users, leagues, categories] = await Promise.all([
          adminApi.users(),
          adminApi.allLeagues(),
          funBetsApi.categories(),
        ])
        setManualUsers(users)
        setManualLeagues(leagues)
        setManualCategories(categories)
        if (users[0]) setManualUserId(users[0].id)
        if (leagues[0]) setManualLeagueId(leagues[0].id)
        if (categories[0]) setManualCategoryId(categories[0].id)
      } catch (err: any) { alert(err.message); return }
    }
    setShowManualForm((v) => !v)
  }

  async function handleManualCreate() {
    if (!manualUserId || !manualLeagueId || !manualCategoryId) return
    setManualLoading(true)
    try {
      const newBet = await adminApi.createManualFunBet({
        userId: manualUserId,
        leagueId: manualLeagueId,
        matchId: match.id,
        categoryId: manualCategoryId,
      })
      setFunBets((prev) => prev ? [...prev, newBet] : [newBet])
      setShowManualForm(false)
    } catch (err: any) { alert(err.message) }
    finally { setManualLoading(false) }
  }

  async function handleAutoValidate() {
    setAutoValidating(true)
    setAutoValidateResult(null)
    try {
      const result = await adminApi.autoValidate(match.id)
      setAutoValidateResult(result)
      // Refrescar la lista de apuestas
      const data = await adminApi.funBetsByMatch(match.id)
      setFunBets(data)
    } catch (err: any) { alert(err.message) }
    finally { setAutoValidating(false) }
  }

  async function handleRevertCategory(categoryId: string) {
    if (!confirm('¿Revertir esta categoría? Se quitarán los puntos otorgados y volverá a estado pendiente.')) return
    setCategoryLoading(`${categoryId}-revert`)
    try {
      await adminApi.revertCategory(match.id, categoryId)
      const data = await adminApi.funBetsByMatch(match.id)
      setFunBets(data)
    } catch (err: any) { alert(err.message) }
    finally { setCategoryLoading(null) }
  }

  async function handleAwardCategory(categoryId: string, occurred: boolean) {
    setCategoryLoading(`${categoryId}-${occurred}`)
    try {
      await adminApi.awardCategory(match.id, categoryId, occurred)
      const data = await adminApi.funBetsByMatch(match.id)
      setFunBets(data)
    } catch (err: any) { alert(err.message) }
    finally { setCategoryLoading(null) }
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
            <div className="mt-2 space-y-3">
              {funBets.length === 0 ? (
                <p className="text-xs text-zinc-600">Nadie apostó en este partido</p>
              ) : (() => {
                // Agrupar por categoría
                const byCategory = new Map<string, { description: string; points: number; bets: AdminFunBet[] }>()
                for (const fb of funBets) {
                  if (!byCategory.has(fb.categoryId)) {
                    byCategory.set(fb.categoryId, { description: fb.description, points: 0, bets: [] })
                  }
                  byCategory.get(fb.categoryId)!.bets.push(fb)
                }

                // Categorías especiales (no auto-validables)
                const SPECIAL = ['fbc-09', 'fbc-10', 'fbc-11', 'fbc-12']

                return (
                  <div className="space-y-2">
                    {/* Botón auto-validar */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAutoValidate}
                        disabled={autoValidating}
                        className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        <Zap className="h-3 w-3" />
                        {autoValidating ? 'Validando...' : '⚡ Auto-validar estándar'}
                      </button>
                    </div>

                    {autoValidateResult && (
                      <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400">
                        ✅ {autoValidateResult.awarded} premiadas · ❌ {autoValidateResult.notOccurred} descartadas · ⏳ {autoValidateResult.skipped} especiales pendientes
                        {autoValidateResult.errors.length > 0 && (
                          <p className="text-amber-400 mt-1">⚠ {autoValidateResult.errors.join(', ')}</p>
                        )}
                      </div>
                    )}

                    {/* Vista por categoría */}
                    {[...byCategory.entries()].map(([catId, { description, bets }]) => {
                      const pending = bets.filter((b) => b.pointsEarned === null)
                      const awarded = bets.filter((b) => b.pointsEarned !== null && b.pointsEarned > 0)
                      const discarded = bets.filter((b) => b.pointsEarned === 0)
                      const isSpecial = SPECIAL.includes(catId)
                      const allDone = pending.length === 0

                      return (
                        <div key={catId} className={cn(
                          'border rounded-xl p-3 space-y-2',
                          allDone ? 'bg-zinc-800/20 border-zinc-700/30' : isSpecial ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/40 border-zinc-700/50'
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-zinc-200">
                                {isSpecial ? '⭐ ' : ''}{description}
                              </span>
                              <span className="text-xs text-zinc-600 ml-2">
                                {bets.length} apuesta{bets.length !== 1 ? 's' : ''}
                                {awarded.length > 0 && <span className="text-emerald-500"> · {awarded.length} ✅</span>}
                                {discarded.length > 0 && <span className="text-zinc-600"> · {discarded.length} ❌</span>}
                              </span>
                            </div>
                            {/* Botones Sí/No — solo si hay pendientes */}
                            {pending.length > 0 && (
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleAwardCategory(catId, true)}
                                  disabled={categoryLoading !== null}
                                  className="text-xs bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-400 border border-emerald-600/30 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                                >
                                  ✅ Sí
                                </button>
                                <button
                                  onClick={() => handleAwardCategory(catId, false)}
                                  disabled={categoryLoading !== null}
                                  className="text-xs bg-red-700/20 hover:bg-red-700/40 text-red-400 border border-red-600/25 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                                >
                                  ❌ No
                                </button>
                              </div>
                            )}
                            {/* Botón Revertir — cuando ya fue aplicada */}
                            {allDone && bets.length > 0 && (
                              <button
                                onClick={() => handleRevertCategory(catId)}
                                disabled={categoryLoading !== null}
                                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
                              >
                                {categoryLoading === `${catId}-revert` ? '...' : '↩ Revertir'}
                              </button>
                            )}
                          </div>

                          {/* Usuarios que apostaron */}
                          <div className="flex flex-wrap gap-1.5">
                            {bets.map((fb) => (
                              <span key={fb.id} className={cn(
                                'text-xs px-2 py-0.5 rounded-full border',
                                fb.pointsEarned === null ? 'bg-zinc-700/50 border-zinc-600/50 text-zinc-300' :
                                fb.pointsEarned > 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                'bg-zinc-800/50 border-zinc-700/30 text-zinc-600 line-through'
                              )}>
                                {fb.avatarUrl ?? ''} {fb.username}
                                {fb.pointsEarned !== null && fb.pointsEarned > 0 && ` +${fb.pointsEarned}pts`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Agregar apuesta manual */}
              <button
                onClick={openManualForm}
                className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1 mt-1 transition-colors"
              >
                <Zap className="h-3 w-3" />
                {showManualForm ? 'Cancelar' : '+ Apuesta manual'}
              </button>

              {showManualForm && (
                <div className="border border-purple-500/25 rounded-xl p-3 space-y-2 bg-purple-500/5">
                  <p className="text-xs text-purple-400 font-medium">Nueva apuesta manual</p>
                  <select value={manualUserId} onChange={(e) => setManualUserId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none">
                    {manualUsers.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                  <select value={manualLeagueId} onChange={(e) => setManualLeagueId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none">
                    {manualLeagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <select value={manualCategoryId} onChange={(e) => setManualCategoryId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none">
                    {manualCategories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
                  </select>
                  <button onClick={handleManualCreate} disabled={manualLoading}
                    className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-all disabled:opacity-50">
                    {manualLoading ? 'Guardando...' : 'Agregar apuesta'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserManagementSection() {
  const [users, setUsers] = useState<{ id: string; username: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    adminApi.users()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div>
        <h2 className="text-white font-semibold">Gestión de usuarios</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Reseteá la contraseña de cualquier jugador</p>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-600">Cargando usuarios...</p>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              expanded={expandedId === u.id}
              onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function UserRow({ user, expanded, onToggle }: {
  user: { id: string; username: string }
  expanded: boolean
  onToggle: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleReset() {
    if (!newPassword) return
    setLoading(true)
    setMsg('')
    try {
      const { message } = await adminApi.resetPassword(user.id, newPassword)
      setMsg(message)
      setNewPassword('')
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 transition-colors"
      >
        <span className="text-sm text-zinc-300 font-medium">@{user.username}</span>
        <span className="text-xs text-zinc-600">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-700/50 px-3 py-3 space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 6 caracteres)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500 outline-none"
          />
          <button
            onClick={handleReset}
            disabled={loading || newPassword.length < 6}
            className="w-full bg-sky-700 hover:bg-sky-600 text-white text-sm font-semibold py-2 rounded-lg transition-all disabled:opacity-40"
          >
            {loading ? 'Reseteando...' : 'Resetear contraseña'}
          </button>
          {msg && <p className="text-xs text-zinc-400 text-center">{msg}</p>}
        </div>
      )}
    </div>
  )
}

function RetroactivePredictionSection() {
  const [matches, setMatches] = useState<{ id: string; homeTeam: string; awayTeam: string; stage: string; status: string; homeScore: number | null; awayScore: number | null }[]>([])
  const [users, setUsers]     = useState<{ id: string; username: string }[]>([])
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  const [matchId,  setMatchId]  = useState('')
  const [userId,   setUserId]   = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [tiebreakWinner, setTiebreakWinner] = useState<'HOME' | 'AWAY' | ''>('')

  const ELIMINATION_STAGES = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL']

  useEffect(() => {
    adminApi.matches().then((all) => setMatches(all)).catch(() => {})
    adminApi.users().then(setUsers).catch(() => {})
    adminApi.allLeagues().then(setLeagues).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!matchId || !userId || !leagueId || homeScore === '' || awayScore === '') return
    setLoading(true)
    setResult(null)
    try {
      const res = await adminApi.loadPredictionForUser({
        matchId, userId, leagueId,
        predictedHomeScore: Number(homeScore),
        predictedAwayScore: Number(awayScore),
        tiebreakWinner: tiebreakWinner || null,
      })
      const pts = res.pointsAwarded ?? res.pointsEarned
      setResult({ ok: true, msg: pts != null ? `✅ Cargado. Puntos otorgados: ${pts}` : '✅ Pronóstico cargado (se puntuará cuando termine el partido)' })
      setMatchId(''); setUserId(''); setLeagueId(''); setHomeScore(''); setAwayScore(''); setTiebreakWinner('')
    } catch (err: any) {
      setResult({ ok: false, msg: `❌ ${err.message}` })
    } finally { setLoading(false) }
  }

  const selectedMatch = matches.find((m) => m.id === matchId)

  return (
    <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-white font-semibold">Pronóstico retroactivo</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Cargá un pronóstico para un usuario que no pudo hacerlo a tiempo. Funciona para cualquier estado de partido.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Partido */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Partido</label>
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">— Seleccioná un partido —</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam} vs {m.awayTeam}
                {m.status === 'FINISHED' && m.homeScore !== null
                  ? ` (${m.homeScore}-${m.awayScore} FIN)`
                  : m.status === 'LIVE'
                  ? ' (EN VIVO)'
                  : ' (PROGRAMADO)'}
              </option>
            ))}
          </select>
        </div>

        {/* Usuario */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Usuario</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">— Seleccioná un usuario —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        {/* Liga */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Liga</label>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">— Seleccioná una liga —</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Scores */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-400">
              {selectedMatch ? selectedMatch.homeTeam : 'Local'}
            </label>
            <input
              type="number" min="0" max="20" value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center"
            />
          </div>
          <div className="flex items-end pb-2 text-zinc-500 font-bold">-</div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-400">
              {selectedMatch ? selectedMatch.awayTeam : 'Visitante'}
            </label>
            <input
              type="number" min="0" max="20" value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center"
            />
          </div>
        </div>

        {/* Tiebreak: solo en eliminatorias con empate */}
        {selectedMatch && ELIMINATION_STAGES.includes(selectedMatch.stage ?? '') && homeScore !== '' && awayScore !== '' && Number(homeScore) === Number(awayScore) && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">¿Quién avanza? (empate en 90min)</label>
            <div className="flex gap-2">
              {(['HOME', 'AWAY'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setTiebreakWinner(tiebreakWinner === side ? '' : side)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${tiebreakWinner === side ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                >
                  {side === 'HOME' ? selectedMatch.homeTeam : selectedMatch.awayTeam}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedMatch?.status === 'FINISHED' && selectedMatch.homeScore !== null && (
          <p className="text-xs text-zinc-500">
            Resultado real: {selectedMatch.homeScore}-{selectedMatch.awayScore} — los puntos se calculan automáticamente.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !matchId || !userId || !leagueId || homeScore === '' || awayScore === ''}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-all"
        >
          {loading ? 'Cargando...' : 'Cargar pronóstico'}
        </button>

        {result && (
          <p className={`text-xs text-center ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.msg}
          </p>
        )}
      </form>
    </div>
  )
}

function ReportsSection() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    adminApi.reports(filter === 'ALL' ? undefined : filter as any)
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  async function handleUpdate(id: string, status?: 'OPEN' | 'RESOLVED', note?: string) {
    setActionLoading(id)
    try {
      const updated = await adminApi.resolveReport(id, {
        ...(status && { status }),
        ...(note !== undefined && { adminNote: note }),
      })
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r))
      if (status === 'RESOLVED') setExpandedId(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const openCount = reports.filter((r) => r.status === 'OPEN').length

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            🐛 Reportes de usuarios
            {openCount > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                {openCount} nuevo{openCount !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">Problemas reportados por los usuarios</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5">
        {(['OPEN', 'RESOLVED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition-colors',
              filter === f
                ? 'bg-sky-600/20 border-sky-500/40 text-sky-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
            )}
          >
            {f === 'OPEN' ? 'Abiertos' : f === 'RESOLVED' ? 'Resueltos' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-zinc-600">Cargando reportes...</p>
      ) : reports.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">
          {filter === 'OPEN' ? '✅ No hay reportes abiertos' : 'Sin reportes'}
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className={cn(
              'border rounded-xl overflow-hidden',
              report.status === 'OPEN' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/30 border-zinc-700/50'
            )}>
              <button
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-white/3 transition-colors"
              >
                <span className="text-base mt-0.5">{report.status === 'OPEN' ? '🔴' : '✅'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-300">@{report.user?.username ?? report.userId}</span>
                    <span className="text-xs text-zinc-600">{new Date(report.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{report.description}</p>
                  {report.page && <p className="text-xs text-zinc-600 mt-0.5">📍 {report.page}</p>}
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0">{expandedId === report.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === report.id && (
                <div className="border-t border-zinc-700/40 px-3 py-3 space-y-3">
                  <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg px-3 py-2">{report.description}</p>

                  {/* Nota admin */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-zinc-500">Nota de respuesta (opcional)</p>
                    <textarea
                      value={noteText[report.id] ?? report.adminNote ?? ''}
                      onChange={(e) => setNoteText((p) => ({ ...p, [report.id]: e.target.value }))}
                      placeholder="Ej: Revisado, el problema era X. Ya está solucionado."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-sky-500/50 outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {report.status === 'OPEN' ? (
                      <button
                        onClick={() => handleUpdate(report.id, 'RESOLVED', noteText[report.id])}
                        disabled={actionLoading === report.id}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        {actionLoading === report.id ? 'Guardando...' : '✅ Marcar resuelto'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdate(report.id, 'OPEN')}
                        disabled={actionLoading === report.id}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-300 text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        Reabrir
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdate(report.id, undefined, noteText[report.id] ?? '')}
                      disabled={actionLoading === report.id}
                      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 text-zinc-400 text-xs px-3 py-2 rounded-lg transition-colors"
                    >
                      Guardar nota
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Phase2Section() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; membersUpdated: number } | null>(null)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function handleActivate() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.activatePhase2()
      setResult(res)
      setConfirmed(false)
    } catch (err: any) {
      setError(err.message ?? 'Error al activar fase 2')
      setConfirmed(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
      <div>
        <h2 className="text-white font-semibold">🏆 Activar Fase 2 — Eliminatorias</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Resetea los puntos de todos los usuarios a solo sus puntos de prediccion
s (elimina los de apuestas locas) y agrega las categorías de apuestas locas de fase 2.
        </p>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1 text-xs text-zinc-400">
        <p>• Los puntos de predicciones se mantienen</p>
        <p>• Los puntos de apuestas locas se eliminan del total</p>
        <p>• Se agregan 7 nuevas categorías de apuestas locas</p>
        <p>• Esta acción <span className="text-amber-400 font-semibold">no se puede deshacer</span></p>
      </div>
      {result ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-green-400 text-sm font-semibold">✅ {result.message}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{result.membersUpdated} miembros actualizados</p>
        </div>
      ) : (
        <button
          onClick={handleActivate}
          disabled={loading}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50',
            confirmed
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-violet-600 hover:bg-violet-500 text-white'
          )}
        >
          {loading ? 'Activando...' : confirmed ? '⚠️ ¿Confirmar? Esta acción no se puede deshacer' : '🚀 Activar Fase 2'}
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  )
}

function TestPushSection() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [customLoading, setCustomLoading] = useState(false)
  const [customResult, setCustomResult] = useState<string | null>(null)

  async function handleTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await adminApi.sendTestPush()
      setResult(`✅ ${res.message}`)
    } catch (err: any) {
      setResult(`❌ ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCustomSend() {
    if (!title.trim() || !body.trim()) return
    setCustomLoading(true)
    setCustomResult(null)
    try {
      const res = await adminApi.sendCustomPush({ title: title.trim(), body: body.trim() })
      setCustomResult(`✅ ${res.message}`)
    } catch (err: any) {
      setCustomResult(`❌ ${err.message}`)
    } finally {
      setCustomLoading(false)
    }
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !customLoading

  return (
    <section className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-white font-semibold">🔔 Notificaciones push</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Enviá mensajes a todos los usuarios suscritos.
        </p>
      </div>

      {/* Test rápido */}
      <div className="border border-zinc-700/40 rounded-lg p-3 space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Prueba rápida</p>
        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-all"
        >
          {loading ? 'Enviando...' : '📣 Enviar notificación de prueba'}
        </button>
        {result && <p className="text-xs text-zinc-300">{result}</p>}
      </div>

      {/* Notificación manual */}
      <div className="border border-zinc-700/40 rounded-lg p-3 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Mensaje personalizado</p>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-zinc-400">Título</label>
              <span className="text-xs text-zinc-600">{title.length}/60</span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="Ej: ⚽ Prode Mundial"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-zinc-400">Mensaje</label>
              <span className="text-xs text-zinc-600">{body.length}/120</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 120))}
              placeholder="Ej: ¡Arrancó la fase de grupos! Hacé tus pronósticos."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-0.5">
            <p className="text-xs text-zinc-500 mb-1.5">Vista previa</p>
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none">⚽</span>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{title || 'Título...'}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{body || 'Mensaje...'}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleCustomSend}
          disabled={!canSend}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-all"
        >
          {customLoading ? 'Enviando...' : '📤 Enviar a todos los suscriptores'}
        </button>
        {customResult && <p className="text-xs text-zinc-300">{customResult}</p>}
      </div>
    </section>
  )
}
