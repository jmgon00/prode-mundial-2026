-- Lista definitiva de 6 categorías de apuestas locas
TRUNCATE TABLE "FunBet";
DELETE FROM "FunBetCategory";

INSERT INTO "FunBetCategory" ("id", "description", "points", "createdAt") VALUES
  ('fbc-01', 'Expulsan a 2 jugadores',          1, NOW()),
  ('fbc-02', 'Gol antes del minuto 10',          1, NOW()),
  ('fbc-03', 'Gol después del minuto 80',        1, NOW()),
  ('fbc-04', 'Se cobra un penal',                1, NOW()),
  ('fbc-05', 'El partido se define en prórroga', 1, NOW()),
  ('fbc-06', 'El partido se define por penales', 1, NOW())
ON CONFLICT ("id") DO UPDATE SET "description" = EXCLUDED."description";
