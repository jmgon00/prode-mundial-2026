'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { adminApi, matchApi, StageStatus, Match } from '@/lib/api'
import { ArrowLeft, Lock, Unlock, CheckCircle, Circle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
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

  useEffect(() => {
    if (!isLoading && user?.isAdmin) {
      Promise.all([adminApi.stages(), adminApi.matches()])
        .then(([s, m]) => { setStages(s); setMatches(m) })
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
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No es admin todavía — mostrar pantalla de claim
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Panel de Admin</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Si sos el primer usuario, podés reclamar el rol de administrador.
            </p>
          </div>
          {claimMsg && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {claimMsg}
            </p>
          )}
          <button
            onClick={handleClaim}
            disabled={claimLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
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
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

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
                    ? <Unlock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
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
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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
      </main>
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

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{formatDate(match.matchDate)}</span>
        <div className="flex items-center gap-1.5">
          {isFinished
            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            : <Circle className="h-3.5 w-3.5 text-zinc-600" />
          }
          <span className={cn('text-xs font-medium', isFinished ? 'text-emerald-400' : 'text-zinc-600')}>
            {isFinished ? 'Finalizado' : 'Pendiente'}
          </span>
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
          <button onClick={handleSaveTeams} disabled={loading} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg font-medium transition-all disabled:opacity-50">
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
          type="number" min="0" max="99"
          value={home}
          onChange={(e) => setHome(e.target.value)}
          placeholder="–"
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-sm font-bold text-white py-1.5 focus:border-emerald-500 outline-none"
        />
        <span className="text-zinc-600 font-bold text-sm">–</span>
        <input
          type="number" min="0" max="99"
          value={away}
          onChange={(e) => setAway(e.target.value)}
          placeholder="–"
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-sm font-bold text-white py-1.5 focus:border-emerald-500 outline-none"
        />
        <button
          onClick={handleSaveResult}
          disabled={loading || home === '' || away === ''}
          className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
        >
          {loading ? '...' : isFinished ? 'Actualizar' : 'Cargar resultado'}
        </button>
      </div>
    </div>
  )
}
