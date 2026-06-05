'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WorldCupLogo } from '@/components/WorldCupLogo'

export default function RegisterPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authApi.register(form)
      login(user, token)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.18_0.04_220)_0%,_oklch(0.09_0_0)_70%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-60" />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center drop-shadow-[0_0_18px_rgba(234,179,8,0.4)]">
            <WorldCupLogo size={96} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-[0.12em] text-white leading-none">
              Prode Mundial
            </h1>
            <p className="text-amber-400 font-bold text-lg tracking-[0.35em] uppercase mt-2">
              2026
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Crear cuenta</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Unite al Prode del Mundial 2026</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vos@ejemplo.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
                className="bg-zinc-800/60 border-zinc-700 focus:border-sky-500 focus:ring-sky-500/20 text-white placeholder:text-zinc-500 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-zinc-300 text-sm">Nombre de usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="pelé10"
                value={form.username}
                onChange={set('username')}
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
                className="bg-zinc-800/60 border-zinc-700 focus:border-sky-500 focus:ring-sky-500/20 text-white placeholder:text-zinc-500 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300 text-sm">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                autoComplete="new-password"
                className="bg-zinc-800/60 border-zinc-700 focus:border-sky-500 focus:ring-sky-500/20 text-white placeholder:text-zinc-500 h-11"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-900/40 transition-all"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
