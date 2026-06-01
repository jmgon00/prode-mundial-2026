import { PrismaClient, Stage } from '@prisma/client'

const prisma = new PrismaClient()

// Tiempos en UTC (convertido desde horario argentino UTC-3)
const G = (g: string) => ({ stage: Stage.GROUP, isActive: true, group: g })
const KO = { isActive: false }

const matches = [
  // ============================================================
  // FASE DE GRUPOS
  // ============================================================

  // --- GRUPO A: México, Sudáfrica, Corea del Sur, Rep. Checa ---
  { ...G('A'), homeTeam: 'México',        awayTeam: 'Sudáfrica',      matchDate: new Date('2026-06-11T19:00:00Z') },
  { ...G('A'), homeTeam: 'Corea del Sur', awayTeam: 'Rep. Checa',     matchDate: new Date('2026-06-12T02:00:00Z') },
  { ...G('A'), homeTeam: 'Rep. Checa',    awayTeam: 'Sudáfrica',      matchDate: new Date('2026-06-18T16:00:00Z') },
  { ...G('A'), homeTeam: 'México',        awayTeam: 'Corea del Sur',  matchDate: new Date('2026-06-19T01:00:00Z') },
  { ...G('A'), homeTeam: 'Rep. Checa',    awayTeam: 'México',         matchDate: new Date('2026-06-25T01:00:00Z') },
  { ...G('A'), homeTeam: 'Sudáfrica',     awayTeam: 'Corea del Sur',  matchDate: new Date('2026-06-25T01:00:00Z') },

  // --- GRUPO B: Canadá, Bosnia y Herz., Qatar, Suiza ---
  { ...G('B'), homeTeam: 'Canadá',          awayTeam: 'Bosnia y Herz.', matchDate: new Date('2026-06-12T19:00:00Z') },
  { ...G('B'), homeTeam: 'Qatar',            awayTeam: 'Suiza',          matchDate: new Date('2026-06-13T19:00:00Z') },
  { ...G('B'), homeTeam: 'Suiza',            awayTeam: 'Bosnia y Herz.', matchDate: new Date('2026-06-18T19:00:00Z') },
  { ...G('B'), homeTeam: 'Canadá',           awayTeam: 'Qatar',          matchDate: new Date('2026-06-18T22:00:00Z') },
  { ...G('B'), homeTeam: 'Suiza',            awayTeam: 'Canadá',         matchDate: new Date('2026-06-24T19:00:00Z') },
  { ...G('B'), homeTeam: 'Bosnia y Herz.',   awayTeam: 'Qatar',          matchDate: new Date('2026-06-24T19:00:00Z') },

  // --- GRUPO C: Brasil, Marruecos, Haití, Escocia ---
  { ...G('C'), homeTeam: 'Brasil',    awayTeam: 'Marruecos', matchDate: new Date('2026-06-13T22:00:00Z') },
  { ...G('C'), homeTeam: 'Haití',     awayTeam: 'Escocia',   matchDate: new Date('2026-06-14T01:00:00Z') },
  { ...G('C'), homeTeam: 'Escocia',   awayTeam: 'Marruecos', matchDate: new Date('2026-06-19T22:00:00Z') },
  { ...G('C'), homeTeam: 'Brasil',    awayTeam: 'Haití',     matchDate: new Date('2026-06-20T01:00:00Z') },
  { ...G('C'), homeTeam: 'Escocia',   awayTeam: 'Brasil',    matchDate: new Date('2026-06-24T22:00:00Z') },
  { ...G('C'), homeTeam: 'Marruecos', awayTeam: 'Haití',     matchDate: new Date('2026-06-26T22:00:00Z') },

  // --- GRUPO D: Estados Unidos, Paraguay, Australia, Turquía ---
  { ...G('D'), homeTeam: 'Estados Unidos', awayTeam: 'Paraguay',       matchDate: new Date('2026-06-13T01:00:00Z') },
  { ...G('D'), homeTeam: 'Australia',      awayTeam: 'Turquía',        matchDate: new Date('2026-06-13T04:00:00Z') },
  { ...G('D'), homeTeam: 'Turquía',        awayTeam: 'Paraguay',       matchDate: new Date('2026-06-19T04:00:00Z') },
  { ...G('D'), homeTeam: 'Estados Unidos', awayTeam: 'Australia',      matchDate: new Date('2026-06-19T19:00:00Z') },
  { ...G('D'), homeTeam: 'Turquía',        awayTeam: 'Estados Unidos', matchDate: new Date('2026-06-26T02:00:00Z') },
  { ...G('D'), homeTeam: 'Paraguay',       awayTeam: 'Australia',      matchDate: new Date('2026-06-26T02:00:00Z') },

  // --- GRUPO E: Alemania, Curazao, Costa de Marfil, Ecuador ---
  { ...G('E'), homeTeam: 'Alemania',        awayTeam: 'Curazao',         matchDate: new Date('2026-06-14T17:00:00Z') },
  { ...G('E'), homeTeam: 'Costa de Marfil', awayTeam: 'Ecuador',         matchDate: new Date('2026-06-14T23:00:00Z') },
  { ...G('E'), homeTeam: 'Alemania',        awayTeam: 'Costa de Marfil', matchDate: new Date('2026-06-20T20:00:00Z') },
  { ...G('E'), homeTeam: 'Curazao',         awayTeam: 'Ecuador',         matchDate: new Date('2026-06-21T00:00:00Z') },
  { ...G('E'), homeTeam: 'Ecuador',         awayTeam: 'Alemania',        matchDate: new Date('2026-06-25T20:00:00Z') },
  { ...G('E'), homeTeam: 'Curazao',         awayTeam: 'Costa de Marfil', matchDate: new Date('2026-06-25T20:00:00Z') },

  // --- GRUPO F: Países Bajos, Japón, Suecia, Túnez ---
  { ...G('F'), homeTeam: 'Países Bajos', awayTeam: 'Japón',        matchDate: new Date('2026-06-14T20:00:00Z') },
  { ...G('F'), homeTeam: 'Suecia',       awayTeam: 'Túnez',        matchDate: new Date('2026-06-15T02:00:00Z') },
  { ...G('F'), homeTeam: 'Países Bajos', awayTeam: 'Suecia',       matchDate: new Date('2026-06-20T17:00:00Z') },
  { ...G('F'), homeTeam: 'Túnez',        awayTeam: 'Japón',        matchDate: new Date('2026-06-21T04:00:00Z') },
  { ...G('F'), homeTeam: 'Japón',        awayTeam: 'Suecia',       matchDate: new Date('2026-06-25T23:00:00Z') },
  { ...G('F'), homeTeam: 'Túnez',        awayTeam: 'Países Bajos', matchDate: new Date('2026-06-25T23:00:00Z') },

  // --- GRUPO G: Bélgica, Egipto, Irán, Nueva Zelanda ---
  { ...G('G'), homeTeam: 'Bélgica',       awayTeam: 'Egipto',       matchDate: new Date('2026-06-15T19:00:00Z') },
  { ...G('G'), homeTeam: 'Irán',          awayTeam: 'Nueva Zelanda', matchDate: new Date('2026-06-16T01:00:00Z') },
  { ...G('G'), homeTeam: 'Bélgica',       awayTeam: 'Irán',         matchDate: new Date('2026-06-21T19:00:00Z') },
  { ...G('G'), homeTeam: 'Nueva Zelanda', awayTeam: 'Egipto',       matchDate: new Date('2026-06-22T01:00:00Z') },
  { ...G('G'), homeTeam: 'Nueva Zelanda', awayTeam: 'Bélgica',      matchDate: new Date('2026-06-27T03:00:00Z') },
  { ...G('G'), homeTeam: 'Egipto',        awayTeam: 'Irán',         matchDate: new Date('2026-06-27T03:00:00Z') },

  // --- GRUPO H: España, Cabo Verde, Arabia Saudita, Uruguay ---
  { ...G('H'), homeTeam: 'España',         awayTeam: 'Cabo Verde',    matchDate: new Date('2026-06-15T16:00:00Z') },
  { ...G('H'), homeTeam: 'Arabia Saudita', awayTeam: 'Uruguay',       matchDate: new Date('2026-06-15T22:00:00Z') },
  { ...G('H'), homeTeam: 'España',         awayTeam: 'Arabia Saudita',matchDate: new Date('2026-06-21T16:00:00Z') },
  { ...G('H'), homeTeam: 'Uruguay',        awayTeam: 'Cabo Verde',    matchDate: new Date('2026-06-21T22:00:00Z') },
  { ...G('H'), homeTeam: 'Uruguay',        awayTeam: 'España',        matchDate: new Date('2026-06-27T00:00:00Z') },
  { ...G('H'), homeTeam: 'Cabo Verde',     awayTeam: 'Arabia Saudita',matchDate: new Date('2026-06-27T00:00:00Z') },

  // --- GRUPO I: Francia, Senegal, Irak, Noruega ---
  { ...G('I'), homeTeam: 'Francia', awayTeam: 'Senegal', matchDate: new Date('2026-06-16T19:00:00Z') },
  { ...G('I'), homeTeam: 'Irak',    awayTeam: 'Noruega', matchDate: new Date('2026-06-16T22:00:00Z') },
  { ...G('I'), homeTeam: 'Francia', awayTeam: 'Irak',    matchDate: new Date('2026-06-22T21:00:00Z') },
  { ...G('I'), homeTeam: 'Noruega', awayTeam: 'Senegal', matchDate: new Date('2026-06-23T00:00:00Z') },
  { ...G('I'), homeTeam: 'Noruega', awayTeam: 'Francia', matchDate: new Date('2026-06-26T19:00:00Z') },
  { ...G('I'), homeTeam: 'Senegal', awayTeam: 'Irak',    matchDate: new Date('2026-06-26T19:00:00Z') },

  // --- GRUPO J: Argentina, Argelia, Austria, Jordania ---
  { ...G('J'), homeTeam: 'Argentina', awayTeam: 'Argelia',   matchDate: new Date('2026-06-17T01:00:00Z') },
  { ...G('J'), homeTeam: 'Austria',   awayTeam: 'Jordania',  matchDate: new Date('2026-06-17T05:00:00Z') },
  { ...G('J'), homeTeam: 'Argentina', awayTeam: 'Austria',   matchDate: new Date('2026-06-22T17:00:00Z') },
  { ...G('J'), homeTeam: 'Jordania',  awayTeam: 'Argelia',   matchDate: new Date('2026-06-23T04:00:00Z') },
  { ...G('J'), homeTeam: 'Jordania',  awayTeam: 'Argentina', matchDate: new Date('2026-06-28T02:00:00Z') },
  { ...G('J'), homeTeam: 'Argelia',   awayTeam: 'Austria',   matchDate: new Date('2026-06-28T02:00:00Z') },

  // --- GRUPO K: Portugal, Congo, Uzbekistán, Colombia ---
  { ...G('K'), homeTeam: 'Portugal',   awayTeam: 'Congo',      matchDate: new Date('2026-06-17T17:00:00Z') },
  { ...G('K'), homeTeam: 'Uzbekistán', awayTeam: 'Colombia',   matchDate: new Date('2026-06-18T02:00:00Z') },
  { ...G('K'), homeTeam: 'Portugal',   awayTeam: 'Uzbekistán', matchDate: new Date('2026-06-23T17:00:00Z') },
  { ...G('K'), homeTeam: 'Colombia',   awayTeam: 'Congo',      matchDate: new Date('2026-06-24T02:00:00Z') },
  { ...G('K'), homeTeam: 'Colombia',   awayTeam: 'Portugal',   matchDate: new Date('2026-06-27T23:30:00Z') },
  { ...G('K'), homeTeam: 'Congo',      awayTeam: 'Uzbekistán', matchDate: new Date('2026-06-27T23:30:00Z') },

  // --- GRUPO L: Inglaterra, Croacia, Ghana, Panamá ---
  { ...G('L'), homeTeam: 'Inglaterra', awayTeam: 'Croacia',    matchDate: new Date('2026-06-17T20:00:00Z') },
  { ...G('L'), homeTeam: 'Ghana',      awayTeam: 'Panamá',     matchDate: new Date('2026-06-17T23:00:00Z') },
  { ...G('L'), homeTeam: 'Inglaterra', awayTeam: 'Ghana',      matchDate: new Date('2026-06-23T20:00:00Z') },
  { ...G('L'), homeTeam: 'Panamá',     awayTeam: 'Croacia',    matchDate: new Date('2026-06-23T23:00:00Z') },
  { ...G('L'), homeTeam: 'Panamá',     awayTeam: 'Inglaterra', matchDate: new Date('2026-06-27T21:00:00Z') },
  { ...G('L'), homeTeam: 'Croacia',    awayTeam: 'Ghana',      matchDate: new Date('2026-06-27T21:00:00Z') },

  // ============================================================
  // RONDA DE 32 (16avos de final)
  // ============================================================
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '2° Grupo A', awayTeam: '2° Grupo B',  matchDate: new Date('2026-06-28T21:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo E', awayTeam: '3° (A/B/C/D/F)',matchDate: new Date('2026-06-29T18:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo F', awayTeam: '2° Grupo C',  matchDate: new Date('2026-06-29T22:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo C', awayTeam: '2° Grupo F',  matchDate: new Date('2026-06-30T01:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo I', awayTeam: '3° (C/D/F/G/H)',matchDate: new Date('2026-06-30T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '2° Grupo E', awayTeam: '2° Grupo I',  matchDate: new Date('2026-06-30T23:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo A', awayTeam: '3° (C/E/F/H/I)',matchDate: new Date('2026-07-01T02:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo L', awayTeam: '3° (E/H/I/J/K)',matchDate: new Date('2026-07-01T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo D', awayTeam: '3° (B/E/F/I/J)',matchDate: new Date('2026-07-01T22:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo G', awayTeam: '3° (A/E/H/I/J)',matchDate: new Date('2026-07-02T01:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '2° Grupo K', awayTeam: '2° Grupo L',  matchDate: new Date('2026-07-02T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo H', awayTeam: '2° Grupo J',  matchDate: new Date('2026-07-02T22:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo B', awayTeam: '3° (E/F/G/I/J)',matchDate: new Date('2026-07-03T01:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo J', awayTeam: '2° Grupo H',  matchDate: new Date('2026-07-03T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '1° Grupo K', awayTeam: '3° (D/E/I/J/L)',matchDate: new Date('2026-07-03T22:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_32, homeTeam: '2° Grupo D', awayTeam: '2° Grupo G',  matchDate: new Date('2026-07-04T01:00:00Z') },

  // ============================================================
  // OCTAVOS DE FINAL (Round of 16)
  // ============================================================
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-2', awayTeam: 'Ganador R32-5', matchDate: new Date('2026-07-04T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-1', awayTeam: 'Ganador R32-3', matchDate: new Date('2026-07-04T23:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-4', awayTeam: 'Ganador R32-6', matchDate: new Date('2026-07-05T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-7', awayTeam: 'Ganador R32-8', matchDate: new Date('2026-07-05T23:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-11',awayTeam: 'Ganador R32-12',matchDate: new Date('2026-07-06T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-9', awayTeam: 'Ganador R32-10',matchDate: new Date('2026-07-06T23:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-14',awayTeam: 'Ganador R32-16',matchDate: new Date('2026-07-07T19:00:00Z') },
  { ...KO, stage: Stage.ROUND_OF_16, homeTeam: 'Ganador R32-13',awayTeam: 'Ganador R32-15',matchDate: new Date('2026-07-07T23:00:00Z') },

  // ============================================================
  // CUARTOS DE FINAL
  // ============================================================
  { ...KO, stage: Stage.QUARTERFINAL, homeTeam: 'Ganador OC-1', awayTeam: 'Ganador OC-2', matchDate: new Date('2026-07-09T23:00:00Z') },
  { ...KO, stage: Stage.QUARTERFINAL, homeTeam: 'Ganador OC-5', awayTeam: 'Ganador OC-6', matchDate: new Date('2026-07-10T23:00:00Z') },
  { ...KO, stage: Stage.QUARTERFINAL, homeTeam: 'Ganador OC-3', awayTeam: 'Ganador OC-4', matchDate: new Date('2026-07-11T19:00:00Z') },
  { ...KO, stage: Stage.QUARTERFINAL, homeTeam: 'Ganador OC-7', awayTeam: 'Ganador OC-8', matchDate: new Date('2026-07-11T23:00:00Z') },

  // ============================================================
  // SEMIFINALES
  // ============================================================
  { ...KO, stage: Stage.SEMIFINAL, homeTeam: 'Ganador CF-1', awayTeam: 'Ganador CF-2', matchDate: new Date('2026-07-14T23:00:00Z') },
  { ...KO, stage: Stage.SEMIFINAL, homeTeam: 'Ganador CF-3', awayTeam: 'Ganador CF-4', matchDate: new Date('2026-07-15T23:00:00Z') },

  // ============================================================
  // TERCER PUESTO
  // ============================================================
  { ...KO, stage: Stage.THIRD_PLACE, homeTeam: 'Perdedor SF-1', awayTeam: 'Perdedor SF-2', matchDate: new Date('2026-07-18T23:00:00Z') },

  // ============================================================
  // FINAL
  // ============================================================
  { ...KO, stage: Stage.FINAL, homeTeam: 'Ganador SF-1', awayTeam: 'Ganador SF-2', matchDate: new Date('2026-07-19T22:00:00Z') },
]

async function main() {
  console.log(`Insertando ${matches.length} partidos...`)
  await prisma.match.deleteMany()
  await prisma.match.createMany({ data: matches })
  console.log(`✓ ${matches.length} partidos insertados`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
