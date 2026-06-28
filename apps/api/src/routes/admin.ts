import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/adminAuth'
import { Stage } from '@prisma/client'
import { scoreMatch } from '../services/scoring'
import { syncWorldCupResults, lastSync } from '../services/worldcup-sync'
import { autoValidateFunBets } from '../services/auto-validate-funbets'
import { env } from '../config/env'
import bcrypt from 'bcryptjs'

const router = Router()

// TEMP: Deletear usuario por email (sin auth, solo para setup)
router.delete('/user/:email', async (req, res, next) => {
  try {
    const { email } = req.params
    if (!email.includes('@')) throw new Error('Email inválido')

    const deleted = await prisma.user.delete({
      where: { email },
      select: { id: true, email: true, username: true }
    })

    res.json({ message: 'Usuario eliminado', user: deleted })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    next(err)
  }
})

// Promover al usuario actual como admin (requiere ser el email autorizado)
router.post('/claim', requireAuth, async (req: any, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, isAdmin: true },
    })
    if (!currentUser) return res.status(404).json({ message: 'Usuario no encontrado' })

    if (env.ADMIN_EMAIL && currentUser.email !== env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'No tenés autorización para ser administrador' })
    }

    const adminExists = await prisma.user.findFirst({ where: { isAdmin: true } })
    if (adminExists) {
      return res.status(403).json({ message: 'Ya existe un administrador' })
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { isAdmin: true },
      select: { id: true, username: true, email: true, isAdmin: true },
    })
    res.json({ message: 'Sos el administrador ahora', user })
  } catch (err) {
    next(err)
  }
})

// Listar el estado de todas las etapas
router.get('/stages', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const stages = await prisma.match.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: {},
    })
    const activeStages = await prisma.match.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: { isActive: true },
    })
    const activeMap = new Map(activeStages.map((s) => [s.stage, s._count.id]))

    const STAGE_ORDER = ['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL']
    const result = STAGE_ORDER.map((stage) => {
      const total = stages.find((s) => s.stage === stage)?._count.id ?? 0
      const active = activeMap.get(stage as Stage) ?? 0
      return { stage, total, active, isUnlocked: active > 0 }
    }).filter((s) => s.total > 0)

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// Desbloquear una etapa (activa todos sus partidos)
router.post('/stages/:stage/unlock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stage = req.params.stage as Stage
    const { count } = await prisma.match.updateMany({
      where: { stage },
      data: { isActive: true },
    })
    res.json({ message: `${count} partidos de ${stage} activados` })
  } catch (err) {
    next(err)
  }
})

// Bloquear una etapa
router.post('/stages/:stage/lock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stage = req.params.stage as Stage
    const { count } = await prisma.match.updateMany({
      where: { stage, status: 'SCHEDULED' },
      data: { isActive: false },
    })
    res.json({ message: `${count} partidos de ${stage} desactivados` })
  } catch (err) {
    next(err)
  }
})

// Listar todos los partidos (para el panel de admin con resultados)
router.get('/matches', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const matches = await prisma.match.findMany({ orderBy: { matchDate: 'asc' } })
    res.json(matches)
  } catch (err) {
    next(err)
  }
})

// Cargar resultado de un partido
const resultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
})

router.patch('/matches/:id/result', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { homeScore, awayScore } = resultSchema.parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeScore, awayScore, status: 'FINISHED' },
    })

    await scoreMatch(match.id, homeScore, awayScore)

    // Auto-validar apuestas locas en background (no bloquea la respuesta)
    autoValidateFunBets(match.id).then((r) => {
      console.log(`[auto-validate] ${match.homeTeam} vs ${match.awayTeam}: +${r.awarded} awarded, ${r.notOccurred} not occurred, ${r.skipped} skipped (especiales)`, r.errors.length ? r.errors : '')
    }).catch((e) => console.error('[auto-validate] Error:', e.message))

    res.json(match)
  } catch (err) {
    next(err)
  }
})

// Cambiar estado de un partido manualmente (LIVE / SCHEDULED)
router.patch('/matches/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['LIVE', 'SCHEDULED']),
    }).parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { status },
    })
    res.json(match)
  } catch (err) {
    next(err)
  }
})

// Actualizar equipos de un partido (para cuando se conocen los clasificados)
router.patch('/matches/:id/teams', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { homeTeam, awayTeam } = z.object({
      homeTeam: z.string().min(1),
      awayTeam: z.string().min(1),
    }).parse(req.body)

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeTeam, awayTeam },
    })
    res.json(match)
  } catch (err) {
    next(err)
  }
})

// Resetear todos los datos de prueba (mantiene partidos y admin)
router.post('/reset-data', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.badge.deleteMany(),
      prisma.funBet.deleteMany(),
      prisma.prediction.deleteMany(),
      prisma.leagueMember.deleteMany(),
      prisma.penalty.deleteMany(),
      prisma.league.deleteMany(),
      prisma.user.deleteMany({ where: { isAdmin: false } }),
      prisma.match.updateMany({
        data: { homeScore: null, awayScore: null, status: 'SCHEDULED' },
      }),
      prisma.match.updateMany({
        where: { stage: { not: 'GROUP' } },
        data: { isActive: false },
      }),
      prisma.match.updateMany({
        where: { stage: 'GROUP' },
        data: { isActive: true },
      }),
    ])
    res.json({ message: 'Datos reseteados correctamente. Partidos y admin intactos.' })
  } catch (err) {
    next(err)
  }
})

// Validación masiva por categoría: award o descarta todos los que apostaron esa categoría en ese partido
router.post('/funbets/award-category', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { matchId, categoryId, occurred } = z.object({
      matchId:    z.string().min(1),
      categoryId: z.string().min(1),
      occurred:   z.boolean(),
    }).parse(req.body)

    const category = await prisma.funBetCategory.findUnique({ where: { id: categoryId } })
    if (!category) return res.status(404).json({ message: 'Categoría no encontrada' })

    const funBets = await prisma.funBet.findMany({
      where: { matchId, categoryId, pointsEarned: null },
    })

    if (funBets.length === 0) {
      return res.json({ message: 'No hay apuestas pendientes para esta categoría', updated: 0 })
    }

    const pts = occurred ? category.points : 0

    await prisma.$transaction([
      prisma.funBet.updateMany({
        where: { matchId, categoryId, pointsEarned: null },
        data: { pointsEarned: pts },
      }),
      // Si ocurrió, sumar puntos a cada usuario en su liga
      ...(occurred ? funBets.map((fb) =>
        prisma.leagueMember.updateMany({
          where: { leagueId: fb.leagueId, userId: fb.userId },
          data: { totalPoints: { increment: pts } },
        })
      ) : []),
    ])

    res.json({
      message: occurred
        ? `+${pts} pts otorgados a ${funBets.length} apuesta${funBets.length !== 1 ? 's' : ''}`
        : `${funBets.length} apuesta${funBets.length !== 1 ? 's' : ''} descartada${funBets.length !== 1 ? 's' : ''} (no ocurrió)`,
      updated: funBets.length,
      occurred,
      pts,
    })
  } catch (err) { next(err) }
})

// Revertir categoría ya aplicada → devuelve puntos y resetea a null
router.post('/funbets/revert-category', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { matchId, categoryId } = z.object({
      matchId:    z.string().min(1),
      categoryId: z.string().min(1),
    }).parse(req.body)

    // Buscar todas las apuestas ya resueltas (pointsEarned !== null)
    const funBets = await prisma.funBet.findMany({
      where: { matchId, categoryId, pointsEarned: { not: null } },
    })

    if (funBets.length === 0) {
      return res.json({ message: 'No hay apuestas aplicadas para revertir', reverted: 0 })
    }

    await prisma.$transaction([
      // Descontar puntos a quienes habían ganado (pointsEarned > 0)
      ...funBets
        .filter((fb) => (fb.pointsEarned ?? 0) > 0)
        .map((fb) =>
          prisma.leagueMember.updateMany({
            where: { leagueId: fb.leagueId, userId: fb.userId },
            data: { totalPoints: { decrement: fb.pointsEarned! } },
          })
        ),
      // Resetear todas a null
      prisma.funBet.updateMany({
        where: { matchId, categoryId },
        data: { pointsEarned: null },
      }),
    ])

    res.json({
      message: `${funBets.length} apuesta${funBets.length !== 1 ? 's' : ''} revertida${funBets.length !== 1 ? 's' : ''} a pendiente`,
      reverted: funBets.length,
    })
  } catch (err) { next(err) }
})

// Ejecutar auto-validación manualmente desde el panel admin
router.post('/funbets/:matchId/auto-validate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await autoValidateFunBets(req.params.matchId)
    res.json(result)
  } catch (err) { next(err) }
})

// Ver apuestas locas de un partido (todas las ligas)
router.get('/funbets/:matchId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const funBets = await prisma.funBet.findMany({
      where: { matchId: req.params.matchId },
      include: {
        user:     { select: { id: true, username: true, avatarUrl: true } },
        league:   { select: { id: true, name: true } },
        category: { select: { id: true, description: true, points: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(funBets.map((fb) => ({
      id:          fb.id,
      userId:      fb.userId,
      username:    fb.user.username,
      avatarUrl:   fb.user.avatarUrl,
      leagueId:    fb.leagueId,
      leagueName:  fb.league.name,
      categoryId:  fb.categoryId,
      description: fb.category.description,
      pointsEarned: fb.pointsEarned,
    })))
  } catch (err) { next(err) }
})

// Otorgar puntos a una apuesta loca
router.patch('/funbets/:id/award', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const fb = await prisma.funBet.findUnique({
      where: { id: req.params.id },
      include: { category: { select: { points: true } } },
    })
    if (!fb) return res.status(404).json({ message: 'Apuesta no encontrada' })
    if (fb.pointsEarned !== null) return res.status(400).json({ message: 'Ya tiene puntos asignados' })

    const pts = fb.category.points
    await prisma.$transaction([
      prisma.funBet.update({ where: { id: fb.id }, data: { pointsEarned: pts } }),
      prisma.leagueMember.updateMany({
        where: { leagueId: fb.leagueId, userId: fb.userId },
        data: { totalPoints: { increment: pts } },
      }),
    ])
    res.json({ message: `+${pts} pt${pts !== 1 ? 's' : ''} otorgado${pts !== 1 ? 's' : ''}`, pointsEarned: pts })
  } catch (err) { next(err) }
})

// Revocar puntos de una apuesta loca
router.patch('/funbets/:id/revoke', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const fb = await prisma.funBet.findUnique({ where: { id: req.params.id } })
    if (!fb) return res.status(404).json({ message: 'Apuesta no encontrada' })
    if (fb.pointsEarned === null) return res.status(400).json({ message: 'No tiene puntos asignados' })

    await prisma.$transaction([
      prisma.funBet.update({ where: { id: fb.id }, data: { pointsEarned: null } }),
      prisma.leagueMember.updateMany({
        where: { leagueId: fb.leagueId, userId: fb.userId },
        data: { totalPoints: { decrement: fb.pointsEarned } },
      }),
    ])
    res.json({ message: 'Puntos revocados', pointsEarned: null })
  } catch (err) { next(err) }
})

// Resetear contraseña de un usuario
router.patch('/users/:id/reset-password', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = z.object({
      newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    }).parse(req.body)

    const hashed = await bcrypt.hash(newPassword, 10)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: hashed },
      select: { id: true, username: true, email: true },
    })
    res.json({ message: `Contraseña de ${user.username} reseteada correctamente`, user })
  } catch (err) { next(err) }
})

// Listar todos los usuarios (para formulario manual)
router.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    })
    res.json(users)
  } catch (err) { next(err) }
})

// Listar todas las ligas (para formulario manual)
router.get('/leagues', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const leagues = await prisma.league.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json(leagues)
  } catch (err) { next(err) }
})

// Crear apuesta loca manual (admin bypassa restricción de partido terminado)
router.post('/funbets/manual', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId, leagueId, matchId, categoryId } = z.object({
      userId:     z.string().min(1),
      leagueId:   z.string().min(1),
      matchId:    z.string().min(1),
      categoryId: z.string().min(1),
    }).parse(req.body)

    const category = await prisma.funBetCategory.findUnique({ where: { id: categoryId } })
    if (!category) return res.status(404).json({ message: 'Categoría no encontrada' })

    const funBet = await prisma.funBet.upsert({
      where: { userId_matchId_categoryId_leagueId: { userId, matchId, categoryId, leagueId } },
      create: { userId, matchId, leagueId, categoryId },
      update: {},
      include: {
        user:     { select: { username: true, avatarUrl: true } },
        league:   { select: { name: true } },
        category: { select: { description: true, points: true } },
      },
    })

    res.status(201).json({
      id:           funBet.id,
      userId:       funBet.userId,
      username:     funBet.user.username,
      avatarUrl:    funBet.user.avatarUrl,
      leagueId:     funBet.leagueId,
      leagueName:   funBet.league.name,
      categoryId:   funBet.categoryId,
      description:  funBet.category.description,
      pointsEarned: funBet.pointsEarned,
    })
  } catch (err) { next(err) }
})

// Listar todos los reportes
router.get('/reports', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query
    const reports = await prisma.report.findMany({
      where: status ? { status: status as any } : undefined,
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(reports)
  } catch (err) { next(err) }
})

// Actualizar estado / nota de un reporte
router.patch('/reports/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, adminNote } = z.object({
      status:    z.enum(['OPEN', 'RESOLVED']).optional(),
      adminNote: z.string().max(500).optional(),
    }).parse(req.body)

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      include: { user: { select: { id: true, username: true } } },
    })
    res.json(report)
  } catch (err) { next(err) }
})

// Estado de la última sincronización
router.get('/sync-status', requireAuth, requireAdmin, (_req, res) => {
  res.json(lastSync)
})

// Sincronización manual con worldcup26.ir
router.post('/sync-now', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const result = await syncWorldCupResults()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// Correr el seed de partidos (solo si no hay partidos)
router.post('/seed-matches', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const existing = await prisma.match.count()
    if (existing > 0) {
      return res.json({ message: `Ya hay ${existing} partidos cargados. Nada que hacer.` })
    }

    const { seedMatches } = await import('../services/seed-matches')
    const count = await seedMatches()
    res.json({ message: `${count} partidos insertados correctamente` })
  } catch (err) {
    next(err)
  }
})

// Activar Fase 2: resetear puntos (solo predicciones) + agregar categorías fase 2
router.post('/phase2/activate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // 1. Resetear totalPoints = solo puntos de predicciones (eliminar funBet pts)
    const members = await prisma.leagueMember.findMany({
      select: { userId: true, leagueId: true },
    })

    await Promise.all(members.map(async (m) => {
      const predPts = await prisma.prediction.aggregate({
        where: { userId: m.userId, leagueId: m.leagueId, pointsEarned: { not: null } },
        _sum: { pointsEarned: true },
      })
      await prisma.leagueMember.updateMany({
        where: { userId: m.userId, leagueId: m.leagueId },
        data: { totalPoints: predPts._sum.pointsEarned ?? 0 },
      })
    }))

    // 2. Agregar categorías de apuestas locas para fase 2
    const phase2Categories = [
      { id: 'fbc-p2-01', description: 'Gol de tiro libre', points: 2 },
      { id: 'fbc-p2-02', description: 'Gol de penal', points: 2 },
      { id: 'fbc-p2-03', description: 'Gol de chilena', points: 2 },
      { id: 'fbc-p2-04', description: '5 tarjetas amarillas en el partido', points: 2 },
      { id: 'fbc-p2-05', description: '2 expulsados en el partido', points: 2 },
      { id: 'fbc-p2-06', description: 'Gol anulado por VAR', points: 2 },
      { id: 'fbc-p2-07', description: 'El partido se define por penales', points: 2 },
    ]

    for (const cat of phase2Categories) {
      await prisma.funBetCategory.upsert({
        where: { id: cat.id },
        create: cat,
        update: { description: cat.description, points: cat.points },
      })
    }

    res.json({
      message: 'Fase 2 activada correctamente',
      membersUpdated: members.length,
      categoriesAdded: phase2Categories.length,
    })
  } catch (err) {
    next(err)
  }
})

export default router
