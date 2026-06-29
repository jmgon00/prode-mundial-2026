# Prompt: Implementar Carga de Pronósticos Retroactivos para Admin

**Para:** Otra IA (Claude, etc.)  
**Creado:** 2026-06-20  
**Estado del Proyecto:** Repo en GitHub, local + Railway, Next.js + Express + Prisma + PostgreSQL

---

## ⚡ Start Here

**Usuario Admin:** Juan Manuel Gonzalez (juanmagonzalez577@gmail.com)  
**Deployment:** Railway (App name: "Prode Mundial 22Recortada")  
**Repo:** GitHub (no specificado aquí, pero usuario puede compartir)  
**Ambiente Local:** Node + Docker + Postgres

**Instrucciones para ejecutar:**
1. Clonar repo (si no estás adentro)
2. `cd apps/api && npm install`
3. `cd ../web && npm install`
4. Levantar Docker (Postgres + Redis)
5. `cd apps/api && npm run dev` (terminal 1)
6. `cd apps/web && npm run dev` (terminal 2)
7. Implementar cambios de Task 1 a Task 7 (ver más abajo)
8. Testear localmente
9. Push a GitHub → Railway redeploy automático

---

## 🎯 Contexto del Problema

**Proyecto:** Prode Mundial 2026 (app de pronósticos de fútbol)  
**Stack:** Next.js 15 (frontend) + Express (backend) + Prisma + PostgreSQL  
**Deployment:** Railway

### El Issue

Algunos partidos se juegan en zonas horarias diferentes (ej: Canadá). Debido a una API gratuita que no funciona bien con las diferencias horarias, ciertos partidos:

1. Se marcan como "EN CURSO" antes de lo que deberían
2. Los usuarios reciben error "El partido ya comenzó" cuando intentan cargar pronóstico
3. Aunque el partido aún no comenzó en la realidad, el sistema lo bloquea

**Resultado:** Usuarios válidos no pueden cargar pronósticos porque el sistema los marca como "tarde".

### La Solución

Crear un **endpoint admin + UI** que permita al administrador (solo tú, usuario único) cargar pronósticos manualmente para usuarios que lo soliciten.

**Scope:**
- Solo el admin puede acceder
- Solo para partidos en estado LIVE o FINISHED
- Solo si el usuario NO tiene pronóstico ya
- Si el partido está FINISHED con scores, se calcula automáticamente

---

## 🔧 Detalles Técnicos del Fix

### 1. Cambio en Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

Agregar campo a modelo `Prediction` (línea ~108-123):

```prisma
model Prediction {
  id                 String   @id @default(uuid())
  userId             String
  matchId            String
  leagueId           String
  predictedHomeScore Int
  predictedAwayScore Int
  pointsEarned       Int?
  loadedByAdmin      Boolean  @default(false)  # <- NUEVO
  createdAt          DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  match  Match  @relation(fields: [matchId], references: [id], onDelete: Cascade)
  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([userId, matchId, leagueId])
}
```

Luego ejecutar:
```bash
cd apps/api
npx prisma migrate dev --name add_loaded_by_admin
```

### 2. Nuevo Endpoint Backend

**Archivo:** `apps/api/src/routes/predictions.ts`

Agregar después de la línea 45 (después del POST normal):

```typescript
// Admin-only: Load prediction retroactively for LIVE/FINISHED matches
const adminLoadSchema = z.object({
  matchId: z.string().uuid(),
  userId: z.string().uuid(),
  leagueId: z.string().uuid(),
  predictedHomeScore: z.number().int().min(0),
  predictedAwayScore: z.number().int().min(0),
})

router.post('/admin-load', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.isAdmin) throw new AppError(403, 'Solo admins pueden cargar pronósticos retroactivos')

    const data = adminLoadSchema.parse(req.body)

    const match = await prisma.match.findUnique({ where: { id: data.matchId } })
    if (!match) throw new AppError(404, 'Partido no encontrado')

    // Only LIVE or FINISHED matches allowed
    if (match.status === 'SCHEDULED') {
      throw new AppError(400, 'El partido no ha comenzado aún. Solo se pueden cargar pronósticos para partidos en vivo o finalizados')
    }

    // Check if user already has prediction for this match+league
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId_leagueId: { userId: data.userId, matchId: data.matchId, leagueId: data.leagueId } },
    })
    if (existing) throw new AppError(400, 'El usuario ya tiene pronóstico cargado para este partido en esta liga')

    // Verify user is member of league
    const isMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: data.leagueId, userId: data.userId } },
    })
    if (!isMember) throw new AppError(403, 'El usuario no es miembro de esta liga')

    // Create prediction with loadedByAdmin flag
    const prediction = await prisma.prediction.create({
      data: {
        userId: data.userId,
        matchId: data.matchId,
        leagueId: data.leagueId,
        predictedHomeScore: data.predictedHomeScore,
        predictedAwayScore: data.predictedAwayScore,
        loadedByAdmin: true,
      },
    })

    // If match is FINISHED, calculate points immediately
    if (match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
      let points = 0
      const actualResult = Math.sign(match.homeScore - match.awayScore)
      const predResult = Math.sign(data.predictedHomeScore - data.predictedAwayScore)

      if (data.predictedHomeScore === match.homeScore && data.predictedAwayScore === match.awayScore) {
        points = 3
      } else if (
        predResult === actualResult &&
        Math.abs(data.predictedHomeScore - data.predictedAwayScore) ===
          Math.abs(match.homeScore - match.awayScore)
      ) {
        points = 2
      } else if (predResult === actualResult) {
        points = 1
      }

      // Update prediction with points
      const updatedPrediction = await prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      })

      // Award points to user in league
      if (points > 0) {
        await prisma.leagueMember.updateMany({
          where: { leagueId: data.leagueId, userId: data.userId },
          data: { totalPoints: { increment: points } },
        })
      }

      return res.status(201).json(updatedPrediction)
    }

    res.status(201).json(prediction)
  } catch (err) {
    next(err)
  }
})
```

### 3. Admin API Client

**Archivo:** `apps/web/lib/api.ts`

Agregar método al objeto `adminApi`:

```typescript
export const adminApi = {
  // ... métodos existentes ...

  async loadPredictionForUser(matchId: string, userId: string, leagueId: string, homeScore: number, awayScore: number) {
    const response = await fetch(`${API_BASE}/predictions/admin-load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        matchId,
        userId,
        leagueId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      }),
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },

  async users(): Promise<{ id: string; username: string }[]> {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },

  async allLeagues(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${API_BASE}/admin/leagues`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },

  async matches(): Promise<Match[]> {
    const response = await fetch(`${API_BASE}/admin/matches`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },
}
```

### 4. UI Admin Panel

**Archivo:** `apps/web/app/admin/page.tsx`

Agregar nueva sección. Ver archivo `docs/superpowers/plans/2026-06-20-retroactive-predictions-admin.md` para el código completo del componente `RetroactivePredictionSection`.

El componente debe:
- Mostrar selector de partido (solo LIVE/FINISHED)
- Selector de usuario
- Selector de liga
- Inputs de scores (home, away)
- Botón "Cargar pronóstico"
- Mensajes de éxito/error

### 5. Endpoints Admin Faltantes

**Archivo:** `apps/api/src/routes/admin.ts`

Verificar que existan estos endpoints (si no, agregarlos):
- `GET /admin/users` → retorna `{ id, username }[]`
- `GET /admin/leagues` → retorna `{ id, name }[]`
- `GET /admin/matches` → retorna `Match[]` con status LIVE/FINISHED

---

## 📋 Desglose Completo de Tasks

### Task 1: Agregar `loadedByAdmin` a Prisma Schema
**Archivo:** `apps/api/prisma/schema.prisma` (línea 108-123)

Ver código en sección "1. Cambio en Prisma Schema" arriba.

Luego ejecutar:
```bash
cd apps/api
npx prisma migrate dev --name add_loaded_by_admin
```

### Task 2: Crear Endpoint `POST /predictions/admin-load`
**Archivo:** `apps/api/src/routes/predictions.ts` (después de línea 45)

Ver código en sección "2. Nuevo Endpoint Backend" arriba.

Validaciones:
- ✅ Solo admin (403 si usuario normal)
- ✅ Solo LIVE/FINISHED (400 si SCHEDULED)
- ✅ Usuario no tiene pronóstico ya (400 si existe)
- ✅ Usuario es miembro de liga (403 si no)
- ✅ Si FINISHED con scores: auto-calcular puntos

### Task 3: Agregar Métodos API Client
**Archivo:** `apps/web/lib/api.ts`

Ver código en sección "3. Admin API Client" arriba.

Métodos necesarios:
- `adminApi.loadPredictionForUser(matchId, userId, leagueId, homeScore, awayScore)`
- `adminApi.users()`
- `adminApi.allLeagues()`
- `adminApi.matches()`

### Task 4: Agregar UI Admin Panel
**Archivo:** `apps/web/app/admin/page.tsx`

Crear nuevo componente `RetroactivePredictionSection()` con:
- Selector partido (filtra LIVE + FINISHED)
- Selector usuario
- Selector liga
- Inputs scores
- Botón cargar
- Mensajes success/error

Insertar en main admin page después de "Gestión de etapas" sección.

**Referencia completa del componente:** Ver archivo `docs/superpowers/plans/2026-06-20-retroactive-predictions-admin.md` (línea ~600-800)

### Task 5: Verificar Endpoints Admin Existen
**Archivo:** `apps/api/src/routes/admin.ts`

Verificar o crear:
- `GET /admin/users` → `{ id, username }[]`
- `GET /admin/leagues` → `{ id, name }[]`
- `GET /admin/matches` → `Match[]`

(Ver código en sección "5. Endpoints Admin Faltantes")

### Task 6: Tests de Integración
**Archivo:** `apps/api/src/routes/predictions.test.ts`

Crear tests para:
- Admin carga predicción LIVE ✓
- Normal user no puede cargar (403)
- No permite SCHEDULED ✓
- No permite si user ya tiene pronóstico
- Auto-scores si FINISHED ✓

(Referencia completa: `docs/superpowers/plans/...`)

### Task 7: Verificación Final
- [ ] `npm test` pasa
- [ ] `npm run build` no tiene errores TypeScript
- [ ] Prisma schema sincronizado
- [ ] Testing checklist completo

---

## ✅ Testing Checklist

Antes de pushear a prod:

- [ ] Prisma migration ejecutada sin errores
- [ ] Backend levanta sin errores
- [ ] Frontend compila sin TypeScript errors
- [ ] Puedo cargar pronóstico para match LIVE (sin scoring)
- [ ] Puedo cargar pronóstico para match FINISHED (con scoring)
- [ ] Error si match es SCHEDULED
- [ ] Error si usuario ya tiene pronóstico
- [ ] Error si usuario no es miembro de la liga
- [ ] Solo admin puede acceder (403 para usuario normal)
- [ ] Points se otorgan correctamente si match FINISHED

---

## 🚀 Deploy a Railway

Una vez que todo funciona local:

```bash
git add .
git commit -m "feat: admin retroactive prediction loader para timezone issues"
git push origin main
```

Railway redeploy automático. Done.

---

## 📝 Notas Importantes

- **No toques el scoring existente** — solo se usa para calcular puntos al cargar pronóstico si match FINISHED
- **El campo `loadedByAdmin`** es solo para auditoría, no afecta cálculo de puntos
- **Solo para admin** — validación en backend es estricta (user.isAdmin debe ser true)
- **Timezone fix a largo plazo:** revisar API de football para entender por qué hay diferencia
- **Order matters:** Task 1 debe completarse antes que Task 2 (Prisma antes de usar campo)
- **Commit frecuente:** Un commit por task completada

---

## 🔗 Archivos Complementarios

- **Plan detallado paso-a-paso:** `docs/superpowers/plans/2026-06-20-retroactive-predictions-admin.md`
- **Memoria del proyecto:** `memory/project_prodemundial.md`
- **Feedback/estándares:** `memory/feedback_prodemundial.md`

---

## 📞 Contacto / Issues

Si algo no funciona o hay dudas:
- Admin: Juan Manuel Gonzalez (juanmagonzalez577@gmail.com)
- Repo: GitHub (usuario compartirá)
- Railway app: "Prode Mundial 22Recortada"

---

**¡Listos! Este prompt tiene todo lo que necesita otra IA para implementar la feature sin contexto previo.**
