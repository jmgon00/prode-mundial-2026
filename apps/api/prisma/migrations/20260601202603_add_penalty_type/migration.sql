-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('REWARD', 'PENALTY');

-- AlterTable
ALTER TABLE "Penalty" ADD COLUMN     "type" "PenaltyType" NOT NULL DEFAULT 'PENALTY';
