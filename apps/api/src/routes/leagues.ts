import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

const router = Router()

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

const createLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  penalties: z
    .array(z.object({
      description: z.string(),
      position: z.number().int().positive(),
      type: z.enum(['REWARD', 'PENALTY']).optional(),
    }))
    .optional(),
})

// Crear liga
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, penalties } = createLeagueSchema.parse(req.body)
    const userId = req.userId!

    let inviteCode: string
    do {
      inviteCode = generateInviteCode()
    } while (await prisma.league.findUnique({ where: { inviteCode } }))

    const league = await prisma.league.create({
      data: {
        name,
        inviteCode,
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
        penalties: penalties
          ? { create: penalties }
          : undefined,
      },
      include: { members: true, penalties: true },
    })

    res.status(201).json(league)
  } catch (err) {
    next(err)
  }
})

// Unirse a liga por código
router.post('/join/:code', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!
    const league = await prisma.league.findUnique({
      where: { inviteCode: req.params.code.toUpperCase() },
    })
    if (!league) throw new AppError(404, 'Liga no encontrada')

    const alreadyMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    })
    if (alreadyMember) throw new AppError(409, 'Ya sos miembro de esta liga')

    await prisma.leagueMember.create({
      data: { leagueId: league.id, userId },
    })

    res.json({ message: 'Te uniste a la liga', league })
  } catch (err) {
    next(err)
  }
})

// Mis ligas
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const memberships = await prisma.leagueMember.findMany({
      where: { userId: req.userId! },
      include: {
        league: {
          include: { members: { include: { user: { select: { username: true, avatarUrl: true } } } } },
        },
      },
    })
    res.json(memberships.map((m) => m.league))
  } catch (err) {
    next(err)
  }
})

// Detalle de una liga
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          orderBy: { totalPoints: 'desc' },
        },
        penalties: true,
      },
    })
    if (!league) throw new AppError(404, 'Liga no encontrada')

    const isMember = league.members.some((m) => m.userId === req.userId)
    if (!isMember) throw new AppError(403, 'No tenés acceso a esta liga')

    res.json(league)
  } catch (err) {
    next(err)
  }
})

// Agregar penitencia/premio a una liga existente (solo owner)
router.post('/:id/penalties', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { description, position, type } = z.object({
      description: z.string().min(1),
      position: z.number().int().positive(),
      type: z.enum(['REWARD', 'PENALTY']).default('PENALTY'),
    }).parse(req.body)

    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) throw new AppError(404, 'Liga no encontrada')
    if (league.ownerId !== req.userId) throw new AppError(403, 'Solo el organizador puede modificar las penitencias')

    const penalty = await prisma.penalty.create({
      data: { leagueId: req.params.id, description, position, type },
    })
    res.status(201).json(penalty)
  } catch (err) {
    next(err)
  }
})

// Eliminar penitencia (solo owner)
router.delete('/:id/penalties/:penaltyId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) throw new AppError(404, 'Liga no encontrada')
    if (league.ownerId !== req.userId) throw new AppError(403, 'Solo el organizador puede modificar las penitencias')

    await prisma.penalty.delete({ where: { id: req.params.penaltyId } })
    res.json({ message: 'Penitencia eliminada' })
  } catch (err) {
    next(err)
  }
})

// Salir de una liga
router.post('/:id/leave', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) throw new AppError(404, 'Liga no encontrada')

    const membership = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: req.params.id, userId } },
    })
    if (!membership) throw new AppError(404, 'No sos miembro de esta liga')

    if (league.ownerId === userId) throw new AppError(403, 'El organizador no puede salir. Transferí la liga o eliminala.')

    await prisma.leagueMember.delete({
      where: { leagueId_userId: { leagueId: req.params.id, userId } },
    })

    res.json({ message: 'Saliste de la liga' })
  } catch (err) {
    next(err)
  }
})

// Eliminar liga (solo el owner)
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) throw new AppError(404, 'Liga no encontrada')
    if (league.ownerId !== userId) throw new AppError(403, 'Solo el organizador puede eliminar la liga')

    // Cascade delete está configurado en el schema (onDelete: Cascade)
    await prisma.league.delete({ where: { id: req.params.id } })

    res.json({ message: 'Liga eliminada' })
  } catch (err) {
    next(err)
  }
})

export default router
