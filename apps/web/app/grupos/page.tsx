'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { groupsApi, GroupStanding } from '@/lib/api'
import { getFlag } from '@/lib/flags'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GruposPage() {
  const { isLoading } = useProtected()
  const router = useRouter()
  const [groups, setGroups] = useState<GroupStanding[]>([])
  const [fetching, setFetching] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchGroups(silent = false) {
    if (!silent) setFetching(true)
    else setRefreshing(true)
    try {
      const data = await groupsApi.list()
      setGroups(data)
      setLastUpdated(new Date())
    } catch { /* silently ignore */ }
    finally { setFetching(false); setRefreshing(false) }
  }

  useEffect(() => {
    if (!isLoading) fetchGroups()
  }, [isLoading])

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stadium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Cargando standings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stadium">
      <header className="border-b border-white/8 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-black uppercase tracking-[0.1em] text-white text-sm leading-none">Tabla de grupos</h1>
            {lastUpdated && (
              <p className="text-xs text-zinc-600 mt-0.5">
                Actualizado {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <button
            onClick={() => fetchGroups(true)}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-safe">
        {groups.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">No hay datos disponibles aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.group} className="bg-white/8 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
                {/* Header del grupo */}
                <div className="bg-sky-500/15 border-b border-sky-500/20 px-4 py-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-sky-500/30 flex items-center justify-center">
                    <span className="text-xs font-black text-sky-300">{g.group}</span>
                  </div>
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Grupo {g.group}</span>
                </div>

                {/* Header columnas */}
                <div className="flex items-center px-3 py-1.5 border-b border-white/5">
                  <span className="flex-1 text-xs text-zinc-600">Equipo</span>
                  <span className="w-6 text-center text-xs text-zinc-600">PJ</span>
                  <span className="w-6 text-center text-xs text-zinc-600">GD</span>
                  <span className="w-8 text-center text-xs font-bold text-zinc-400">Pts</span>
                </div>

                {/* Equipos */}
                {g.teams.map((team, idx) => (
                  <div
                    key={team.teamId}
                    className={cn(
                      'flex items-center px-3 py-2.5 border-b border-white/5 last:border-0',
                      idx < 2 && 'bg-sky-500/5',
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-zinc-600 w-4">{idx + 1}</span>
                      <span className="text-base leading-none">{getFlag(team.name_en)}</span>
                      <span className={cn(
                        'text-sm truncate',
                        idx < 2 ? 'text-white font-semibold' : 'text-zinc-400',
                      )}>
                        {team.name_en}
                      </span>
                    </div>
                    <span className="w-6 text-center text-xs text-zinc-500">{team.mp}</span>
                    <span className={cn(
                      'w-6 text-center text-xs',
                      team.gd > 0 && 'text-sky-400',
                      team.gd < 0 && 'text-red-400',
                      team.gd === 0 && 'text-zinc-500',
                    )}>
                      {team.gd > 0 ? `+${team.gd}` : team.gd}
                    </span>
                    <span className={cn(
                      'w-8 text-center text-sm font-black',
                      idx < 2 ? 'text-sky-400' : 'text-zinc-500',
                    )}>
                      {team.pts}
                    </span>
                  </div>
                ))}

                {/* Leyenda */}
                <div className="px-3 py-1.5 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500/40" />
                  <span className="text-xs text-zinc-600">Clasifican al Ronda de 32</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
