# 🔍 Informe de Auditoría de Puntos — Liga 22 Mundialista

**Fecha:** 23 de junio de 2026

---

## ¿Qué pasó?

Detectamos un bug en el sistema de puntuación automática: el servidor sincroniza los resultados de los partidos cada 3 minutos, y en algunos casos estaba sumando los puntos **más de una vez** para el mismo partido. Esto hizo que algunos jugadores aparecieran con más puntos de los que realmente correspondían.

---

## Jugadores afectados

| Usuario | Puntos anteriores | Puntos corregidos | Diferencia |
|---|---|---|---|
| Enzoz10 | 103 | 98 | -5 |
| juani_leproso_128 | 70 | 65 | -5 |
| Gatigol | 55 | 51 | -4 |
| cochi_cabj | 80 | 79 | -1 |
| AugustoCsir | 93 | 92 | -1 |
| Rodri Carp | 62 | 61 | -1 |
| Fik | 91 | 91 | Sin cambios |
| JOTAEME | 90 | 90 | Sin cambios |
| Frank | 72 | 72 | Sin cambios |
| FG9 | 83 | 83 | Sin cambios* |

*FG9 fue corregido manualmente días atrás por un caso distinto.

---

## ¿Cambia el ranking?

No. El orden de posiciones se mantiene igual:

🥇 Enzoz10 — 98 pts  
🥈 AugustoCsir — 92 pts  
🥉 Fik — 91 pts  
4° JOTAEME — 90 pts  
5° FG9 — 83 pts  
6° cochi_cabj — 79 pts  
7° Frank — 72 pts  
8° juani_leproso_128 — 65 pts  
9° Rodri Carp — 61 pts  
10° Gatigol — 51 pts  

---

## ¿Está solucionado?

Sí. Los puntos fueron corregidos en la base de datos y el bug fue reparado en el código para que no vuelva a ocurrir. Todos los partidos que se jueguen de ahora en adelante van a calcular los puntos correctamente.

---

*Cualquier consulta o discrepancia, reportala desde la app con el botón 🐛 Reportar.*
