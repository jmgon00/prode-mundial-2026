-- Limpiar apuestas existentes y reemplazar categorías con lista definitiva
TRUNCATE TABLE "FunBet";
DELETE FROM "FunBetCategory";

INSERT INTO "FunBetCategory" ("id", "description", "points", "createdAt") VALUES
  ('fbc-01', 'Expulsan a 2 jugadores',                          1, NOW()),
  ('fbc-02', 'Gol y expulsión del mismo jugador',               1, NOW()),
  ('fbc-03', 'Gol antes del minuto 10',                         1, NOW()),
  ('fbc-04', 'Gol después del minuto 80',                       1, NOW()),
  ('fbc-05', 'Gol de chilena',                                  1, NOW()),
  ('fbc-06', 'Gol del arquero',                                 1, NOW()),
  ('fbc-07', 'Gol de Argentina (si Argentina juega)',           1, NOW()),
  ('fbc-08', 'Gol en tiempo suplementario y define (45+ y 90+)',1, NOW()),
  ('fbc-09', 'Se cobra un penal y lo convierte',                1, NOW()),
  ('fbc-10', 'Se cobra un penal y lo erra',                     1, NOW()),
  ('fbc-11', 'El partido se define en prórroga',                1, NOW()),
  ('fbc-12', 'El equipo local gana por diferencia de 3 goles',  1, NOW()),
  ('fbc-13', 'El equipo visitante gana por diferencia de 3 goles', 1, NOW()),
  ('fbc-14', 'Cambio de arquero',                               1, NOW()),
  ('fbc-15', 'Resultado exacto 3-3',                            1, NOW()),
  ('fbc-16', 'El partido se define por penales',                1, NOW())
ON CONFLICT ("id") DO UPDATE SET "description" = EXCLUDED."description";
