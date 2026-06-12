-- Drop old FunBet table (prediction-based, incompatible with new schema)
DROP TABLE IF EXISTS "FunBet";

-- CreateTable FunBetCategory
CREATE TABLE "FunBetCategory" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunBetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable FunBet (nuevo esquema con categoryId)
CREATE TABLE "FunBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "pointsEarned" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunBet_userId_matchId_categoryId_leagueId_key" ON "FunBet"("userId", "matchId", "categoryId", "leagueId");

-- AddForeignKey
ALTER TABLE "FunBet" ADD CONSTRAINT "FunBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FunBet" ADD CONSTRAINT "FunBet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FunBet" ADD CONSTRAINT "FunBet_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FunBet" ADD CONSTRAINT "FunBet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FunBetCategory"("id") ON UPDATE CASCADE;

-- Seed: 14 categorías de apuestas locas
INSERT INTO "FunBetCategory" ("id", "description", "points", "createdAt") VALUES
  ('fbc-01', 'Resultado exacto 1-0 o 2-0',               1, NOW()),
  ('fbc-02', 'Resultado exacto 0-1 o 0-2',               1, NOW()),
  ('fbc-03', 'Resultado exacto 1-1',                     1, NOW()),
  ('fbc-04', 'Gol antes del minuto 15',                  1, NOW()),
  ('fbc-05', 'Gol entre minutos 15-45',                  1, NOW()),
  ('fbc-06', 'Gol entre minutos 45-65',                  1, NOW()),
  ('fbc-07', 'Gol entre minutos 65-90',                  1, NOW()),
  ('fbc-08', 'Un equipo metió 3+ goles',                 1, NOW()),
  ('fbc-09', 'Tarjeta roja en el partido',               1, NOW()),
  ('fbc-10', 'Penalti convertido',                       1, NOW()),
  ('fbc-11', 'Definición por penales',                   1, NOW()),
  ('fbc-12', 'El partido va a prórroga',                 1, NOW()),
  ('fbc-13', 'Gol de Argentina (si Argentina juega)',    1, NOW()),
  ('fbc-14', 'Expulsión y gol en mismo partido',         1, NOW())
ON CONFLICT ("id") DO NOTHING;
