import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Guardar o actualizar apuesta loca (bloqueada al inicio del partido)
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { matchId, leagueId, prediction } = z.object({
      matchId:    z.string().uuid(),
      leagueId:   z.string().uuid(),
      prediction: z.string().min(1).max(300).trim(),
    }).parse(req.body)

    const userId = req.userId!

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (new Date() >= match.matchDate) throw new AppError(400, 'Ya no se pueden editar apuestas para este partido')

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const funBet = await prisma.funBet.upsert({
      where: { userId_matchId_leagueId: { userId, matchId, leagueId } },
      create: { userId, matchId, leagueId, prediction },
      update: { prediction },
    })

    res.status(201).json(funBet)
  } catch (err) {
    next(err)
  }
})

// Apuestas locas del usuario en una liga
router.get('/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const funBets = await prisma.funBet.findMany({
      where: { userId, leagueId },
    })
    res.json(funBets)
  } catch (err) {
    next(err)
  }
})

// Apuestas locas de todos para un partido (solo cuando terminó)
router.get('/match/:matchId/league/:leagueId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { matchId, leagueId } = req.params
    const userId = req.userId!

    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!isMember) throw new AppError(403, 'No sos miembro de esta liga')

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true } })
    if (!match) throw new AppError(404, 'Partido no encontrado')
    if (match.status !== 'FINISHED') throw new AppError(400, 'El partido aún no terminó')

    const funBets = await prisma.funBet.findMany({
      where: { matchId, leagueId },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json(funBets.map((fb) => ({
      userId:     fb.userId,
      username:   fb.user.username,
      avatarUrl:  fb.user.avatarUrl,
      prediction: fb.prediction,
    })))
  } catch (err) {
    next(err)
  }
})

export default router
