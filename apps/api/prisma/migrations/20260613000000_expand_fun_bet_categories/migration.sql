-- Actualizar fbc-01 a 3 puntos (categoría especial)
UPDATE "FunBetCategory" SET "points" = 3 WHERE "id" = 'fbc-01';

-- Agregar nuevas categorías
INSERT INTO "FunBetCategory" ("id", "description", "points", "createdAt") VALUES
  ('fbc-07', 'Tarjeta amarilla',            1, NOW()),
  ('fbc-08', 'Tarjeta roja',                1, NOW()),
  ('fbc-09', 'Gol de chilena',              3, NOW()),
  ('fbc-10', 'Gol olímpico',               3, NOW()),
  ('fbc-11', 'Gol de tiro libre de Messi', 3, NOW()),
  ('fbc-12', 'Gol de palometa',            3, NOW())
ON CONFLICT ("id") DO NOTHING;
