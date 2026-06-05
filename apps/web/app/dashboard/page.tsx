'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProtected } from '@/hooks/use-protected'
import { leagueApi, userApi, matchApi, League, Match, MatchSummary } from '@/lib/api'
import { WorldCupLogo } from '@/components/WorldCupLogo'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LogOut, Plus, Users, Trophy, ChevronRight, Hash, ShieldCheck, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { user, isLoading } = useProtected()
  const { logout } = useAuth()
  const router = useRouter()
  const [leagues, setLeagues] = useState<League[]>([])
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [fetching, setFetching] = useState(true)

  const [profileOpen, setProfileOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [penalties, setPenalties] = useState<{ description: string; position: number }[]>([])
  const [penaltyInput, setPenaltyInput] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!isLoading && user) {
      Promise.all([leagueApi.list(), matchApi.summary()])
        .then(([l, s]) => { setLeagues(l); setSummary(s) })
        .finally(() => setFetching(false))
    }
  }, [user, isLoading])

  function addPenalty() {
    if (!penaltyInput.trim()) return
    setPenalties((prev) => [
      ...prev,
      { description: penaltyInput.trim(), position: prev.length + 1 },
    ])
    setPenaltyInput('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreateLoading(true)
    try {
      const league = await leagueApi.create({
        name: createName,
        penalties: penalties.length > 0 ? penalties : undefined,
      })
      setLeagues((prev) => [league, ...prev])
      setCreateOpen(false)
      setCreateName('')
      setPenalties([])
      setPenaltyInput('')
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    setJoinLoading(true)
    try {
      const { league } = await leagueApi.join(joinCode.trim().toUpperCase())
      setLeagues((prev) => [...prev, league])
      setJoinOpen(false)
      setJoinCode('')
    } catch (err: any) {
      setJoinError(err.message)
    } finally {
      setJoinLoading(false)
    }
  }

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stadium">
      {/* Header */}
      <header className="border-b border-white/8 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]">
              <WorldCupLogo size={32} />
            </div>
            <div>
              <p className="font-black uppercase tracking-[0.1em] text-white text-sm leading-none">Prode Mundial</p>
              <p className="text-amber-400 font-bold text-xs tracking-[0.3em] uppercase leading-tight">2026</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {user?.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </button>
            )}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              {user?.avatarUrl
                ? <span className="text-base leading-none">{user.avatarUrl}</span>
                : <UserCog className="h-3.5 w-3.5" />
              }
              <span className="font-medium">@{user?.username}</span>
            </button>
            <button
              onClick={() => { logout(); router.replace('/login') }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-safe">

        {/* Próximo partido */}
        {summary?.next && (
          <div className="bg-sky-500/8 border border-sky-500/25 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Próximo partido</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white text-sm">
                {summary.next.homeTeam} <span className="text-zinc-500 font-normal">vs</span> {summary.next.awayTeam}
              </p>
              <span className="text-xs text-zinc-400 flex-shrink-0">
                {new Date(summary.next.matchDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Últimos resultados */}
        {summary && summary.recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Últimos resultados</p>
            <div className="space-y-1.5">
              {summary.recent.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-zinc-900/60 border border-white/6 rounded-lg px-3 py-2">
                  <span className="flex-1 text-right text-sm font-semibold text-white truncate">{m.homeTeam}</span>
                  <span className="bg-zinc-800 text-white font-bold text-sm px-2.5 py-0.5 rounded-md flex-shrink-0 font-mono">
                    {m.homeScore} – {m.awayScore}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white truncate">{m.awayTeam}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mis ligas */}
        {leagues.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mis ligas</p>
            {leagues.map((league) => {
              const me = league.members?.find((m) => m.userId === user!.id)
              const myPoints = me?.totalPoints ?? 0
              const myRank = (league.members?.filter((m) => m.totalPoints > myPoints).length ?? 0) + 1
              const memberCount = league.members?.length ?? 0
              return (
                <button
                  key={league.id}
                  onClick={() => router.push(`/leagues/${league.id}`)}
                  className="w-full bg-zinc-900/80 border border-white/8 hover:border-sky-500/30 rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-[0.98] text-left group hover:shadow-lg hover:shadow-sky-900/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white text-base leading-tight">{league.name}</p>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-sky-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-4">
                    {myPoints > 0 ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-white leading-none">{myRank}°</span>
                          <span className="text-zinc-500 text-sm">de {memberCount}</span>
                        </div>
                        <div className="w-px h-7 bg-white/10" />
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-amber-400 leading-none">{myPoints}</span>
                          <span className="text-zinc-500 text-xs">pts</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-zinc-600 text-sm">Sin partidos jugados aún</span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-zinc-600">
                      <Users className="h-3 w-3" />
                      {memberCount}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Estado vacío */}
        {leagues.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/80 text-4xl">🏆</div>
            <div>
              <p className="text-white font-semibold">Todavía no estás en ninguna liga</p>
              <p className="text-zinc-500 text-sm mt-1">Creá una o pedile el código a un amigo</p>
            </div>
          </div>
        )}

        {/* Acciones secundarias */}
        <div className="flex gap-3">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-sky-500/40 text-zinc-400 hover:text-sky-300 text-sm font-medium py-2.5 rounded-xl transition-all active:scale-[0.97]">
                <Plus className="h-3.5 w-3.5" />
                Nueva liga
              </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Nueva liga</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="league-name" className="text-zinc-300 text-sm">Nombre</Label>
                  <Input
                    id="league-name"
                    placeholder="Los Cracks del Barrio"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    minLength={3}
                    className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white placeholder:text-zinc-500 h-11"
                  />
                </div>

                {/* Penitencias */}
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Penitencias <span className="text-zinc-600 font-normal">(opcional)</span></p>
                    <p className="text-xs text-zinc-500 mt-0.5">Definí qué le toca a cada posición del final. La primera que agregues es para el último, la segunda para el anteúltimo, etc.</p>
                  </div>

                  {penalties.length > 0 && (
                    <div className="space-y-1.5">
                      {penalties.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                          <span className="text-xs text-zinc-500 font-mono w-6 flex-shrink-0">{i + 1}°</span>
                          <span className="flex-1 text-sm text-zinc-200 truncate">{p.description}</span>
                          <button
                            type="button"
                            onClick={() => setPenalties((prev) => prev.filter((_, j) => j !== i).map((x, j) => ({ ...x, position: j + 1 })))}
                            className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Pagar la cena"
                      value={penaltyInput}
                      onChange={(e) => setPenaltyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPenalty() } }}
                      className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white placeholder:text-zinc-500 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addPenalty}
                      className="flex-shrink-0 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium px-3 rounded-lg transition-all"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {createError && <p className="text-sm text-red-400">{createError}</p>}
                <Button type="submit" className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold" disabled={createLoading}>
                  {createLoading ? 'Creando...' : 'Crear liga'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-sky-500/40 text-zinc-400 hover:text-sky-300 text-sm font-medium py-2.5 rounded-xl transition-all active:scale-[0.97]">
                <Users className="h-3.5 w-3.5" />
                Unirse
              </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Unirse a una liga</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoin} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-code" className="text-zinc-300 text-sm">Código de invitación</Label>
                  <Input
                    id="invite-code"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white placeholder:text-zinc-500 h-11 uppercase tracking-widest font-mono"
                  />
                </div>
                {joinError && <p className="text-sm text-red-400">{joinError}</p>}
                <Button type="submit" className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold" disabled={joinLoading}>
                  {joinLoading ? 'Uniéndose...' : 'Unirse'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}

const AVATARS = ['⚽','🏆','🥇','🦁','🐯','🦊','🦅','🔥','⚡','🌟','🎯','👑','🐲','💪','🏅','🦾','🎭','🤺','🧨','🎪']

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, login, token } = useAuth()
  const [username, setUsername] = useState(user?.username ?? '')
  const [avatar, setAvatar] = useState(user?.avatarUrl ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload: any = {}
      if (username !== user?.username) payload.username = username
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword }
      if (avatar !== (user?.avatarUrl ?? '')) payload.avatar = avatar
      if (!Object.keys(payload).length) { setError('No hay cambios para guardar'); setLoading(false); return }

      const { user: updated } = await userApi.updateMe(payload)
      login(updated, token!)
      setSuccess('Perfil actualizado')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Mi perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Avatar</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setAvatar(avatar === emoji ? '' : emoji)}
                  className={cn('w-9 h-9 text-lg flex items-center justify-center rounded-lg transition-all',
                    avatar === emoji ? 'bg-sky-500/20 border border-sky-500/50 scale-110' : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                  )}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Email</Label>
            <p className="text-sm text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2">{user?.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-username" className="text-zinc-300 text-sm">Nombre de usuario</Label>
            <Input
              id="p-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white h-11"
            />
          </div>
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Cambiar contraseña (opcional)</p>
            <div className="space-y-1.5">
              <Label htmlFor="p-current" className="text-zinc-300 text-sm">Contraseña actual</Label>
              <Input
                id="p-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white placeholder:text-zinc-500 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-new" className="text-zinc-300 text-sm">Nueva contraseña</Label>
              <Input
                id="p-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
                className="bg-zinc-800 border-zinc-700 focus:border-sky-500 text-white placeholder:text-zinc-500 h-11"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">{success}</p>}
          <Button type="submit" className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
