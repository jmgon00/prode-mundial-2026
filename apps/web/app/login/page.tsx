'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { authApi } from '@/lib/api'
import { WorldCupLogo } from '@/components/WorldCupLogo'
import { Mail, Lock, Eye, EyeOff, User, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authApi.login({ email, password })
      login(user, token)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0B0F14' }}
    >
      {/* ── Fondo estadio ── */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 55% 45% at 12% 30%, rgba(23,148,255,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 55% 45% at 88% 30%, rgba(23,148,255,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 90% 45% at 50% 105%, rgba(0,35,0,0.55) 0%, transparent 60%),
          linear-gradient(180deg, #0B0F14 0%, #0d1219 55%, #090d09 100%)
        `
      }} />

      {/* Luz de foco izquierda */}
      <div className="absolute pointer-events-none" style={{
        top: 0, left: '-10%', width: '50%', height: '60%',
        background: 'radial-gradient(ellipse at top left, rgba(190,215,255,0.07) 0%, transparent 65%)',
        transform: 'rotate(-12deg)',
      }} />
      {/* Luz de foco derecha */}
      <div className="absolute pointer-events-none" style={{
        top: 0, right: '-10%', width: '50%', height: '60%',
        background: 'radial-gradient(ellipse at top right, rgba(190,215,255,0.07) 0%, transparent 65%)',
        transform: 'rotate(12deg)',
      }} />
      {/* Césped inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'linear-gradient(0deg, rgba(0,28,0,0.35) 0%, transparent 100%)'
      }} />

      {/* ── Contenido ── */}
      <div className="relative w-full max-w-sm space-y-6">

        {/* Logo + Título */}
        <div className="text-center space-y-3">
          <div className="flex justify-center" style={{
            filter: 'drop-shadow(0 0 28px rgba(212,175,55,0.55)) drop-shadow(0 0 10px rgba(212,175,55,0.25))'
          }}>
            <WorldCupLogo size={90} />
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-[2.55rem] font-black uppercase leading-none text-white"
              style={{ letterSpacing: '0.09em', textShadow: '0 2px 30px rgba(255,255,255,0.06)' }}
            >
              Prode Mundial
            </h1>

            {/* 2026 con líneas decorativas */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-14" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37)' }} />
              <span className="font-bold text-lg tracking-[0.35em]" style={{ color: '#D4AF37' }}>2026</span>
              <div className="h-px w-14" style={{ background: 'linear-gradient(270deg, transparent, #D4AF37)' }} />
            </div>

            <p className="text-xs font-medium tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Jugá. Pronosticá. Competí.
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: 'rgba(20,23,29,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(212,175,55,0.30)',
          borderRadius: '20px',
          padding: '28px 24px 22px',
          boxShadow: '0 0 0 1px rgba(212,175,55,0.04), 0 30px 60px rgba(0,0,0,0.55), 0 0 100px rgba(212,175,55,0.03)',
        }}>

          <div className="mb-5">
            <h2 className="text-xl font-bold" style={{ color: '#D4AF37' }}>Ingresar</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Accedé a tus ligas y pronósticos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.28)' }} />
                <input
                  type="email"
                  placeholder="vos@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '11px 14px 11px 38px',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(23,148,255,0.55)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(23,148,255,0.10)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.28)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '11px 42px 11px 38px',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(23,148,255,0.55)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(23,148,255,0.10)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.22)',
                borderRadius: '8px',
                padding: '9px 12px',
              }}>
                <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
              </div>
            )}

            {/* Botón Ingresar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold text-sm text-white transition-all"
              style={{
                background: loading ? 'rgba(23,148,255,0.45)' : '#1794FF',
                borderRadius: '10px',
                padding: '12px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 22px rgba(23,148,255,0.38)',
                letterSpacing: '0.025em',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#3da8ff'
                  e.currentTarget.style.boxShadow = '0 6px 30px rgba(23,148,255,0.52)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#1794FF'
                  e.currentTarget.style.boxShadow = '0 4px 22px rgba(23,148,255,0.38)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>o</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Botón Registrate */}
          <Link href="/register" className="block">
            <button
              className="w-full font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,175,55,0.38)',
                borderRadius: '10px',
                padding: '11px',
                cursor: 'pointer',
                color: '#D4AF37',
                letterSpacing: '0.025em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212,175,55,0.07)'
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.65)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.38)'
              }}
            >
              <User size={14} />
              Registrate
            </button>
          </Link>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <ShieldCheck size={11} style={{ color: 'rgba(255,255,255,0.18)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>Tus datos están protegidos</span>
          </div>
        </div>
      </div>
    </div>
  )
}
