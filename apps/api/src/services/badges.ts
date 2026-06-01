import { prisma } from '../lib/prisma'
import { BadgeType, Stage } from '@prisma/client'

export async function checkAndAwardBadges(
  matchId: string,
  userId: string,
  leagueId: string,
  pointsEarned: number,
  matchStage: Stage,
) {
  await Promise.all([
    checkExactScore(matchId, userId, leagueId, pointsEarned),
    checkThreeInARow(matchId, userId, leagueId, pointsEarned),
    checkFlawlessGroupStage(matchId, userId, leagueId, matchStage),
  ])
}

export async function checkWoodenSpoon(leagueId: string) {
  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    orderBy: { totalPoints: 'asc' },
  })
  if (members.length < 2) return

  const loser = members[0]
  const already = await prisma.badge.findFirst({
    where: { userId: loser.userId, leagueId, type: BadgeType.WOODEN_SPOON },
  })
  if (already) return

  await prisma.badge.create({
    data: { userId: loser.userId, leagueId, type: BadgeType.WOODEN_SPOON },
  })
}

async function checkExactScore(matchId: string, userId: string, leagueId: string, pointsEarned: number) {
  if (pointsEarned !== 3) return
  await prisma.badge.create({
    data: { userId, leagueId, type: BadgeType.EXACT_SCORE, matchId },
  })
}

async function checkThreeInARow(matchId: string, userId: string, leagueId: string, pointsEarned: number) {
  if (pointsEarned !== 3) return

  const recent = await prisma.prediction.findMany({
    where: { userId, leagueId, pointsEarned: { not: null } },
    include: { match: { select: { matchDate: true } } },
    orderBy: { match: { matchDate: 'desc' } },
    take: 3,
  })

  if (recent.length < 3) return
  if (!recent.every((p) => p.pointsEarned === 3)) return

  const already = await prisma.badge.findFirst({
    where: { userId, leagueId, type: BadgeType.THREE_IN_A_ROW, matchId },
  })
  if (already) return

  await prisma.badge.create({
    data: { userId, leagueId, type: BadgeType.THREE_IN_A_ROW, matchId },
  })
}

async function checkFlawlessGroupStage(matchId: string, userId: string, leagueId: string, matchStage: Stage) {
  if (matchStage !== Stage.GROUP) return

  const totalGroup = await prisma.match.count({ where: { stage: Stage.GROUP } })
  const finishedGroup = await prisma.match.count({ where: { stage: Stage.GROUP, status: 'FINISHED' } })
  if (finishedGroup < totalGroup) return

  const preds = await prisma.prediction.findMany({
    where: {
      userId,
      leagueId,
      match: { stage: Stage.GROUP },
      pointsEarned: { not: null },
    },
  })

  if (preds.length < totalGroup) return
  if (preds.some((p) => (p.pointsEarned ?? 0) === 0)) return

  const already = await prisma.badge.findFirst({
    where: { userId, leagueId, type: BadgeType.FLAWLESS_GROUP_STAGE },
  })
  if (already) return

  await prisma.badge.create({
    data: { userId, leagueId, type: BadgeType.FLAWLESS_GROUP_STAGE, matchId },
  })
}
