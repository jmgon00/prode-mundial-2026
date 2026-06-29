# Retroactive Predictions Admin Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admin to manually load prediction scores for users who couldn't load them before match kickoff due to timezone API issues, for matches in LIVE or FINISHED status.

**Architecture:** Add `loadedByAdmin` boolean flag to Prediction model. Create new admin endpoint `POST /api/predictions/admin-load` that validates match status (LIVE/FINISHED), user hasn't predicted yet, then inserts prediction with flag. If match is FINISHED, auto-score immediately. Extend admin panel with new section showing match + user selectors and score inputs.

**Tech Stack:** Next.js 15 (frontend), Express (backend), Prisma (ORM), PostgreSQL

## Global Constraints

- Stack: Next.js + Express + Prisma + PostgreSQL on Railway
- Validation: Only LIVE/FINISHED matches, user must not have existing prediction, only admin can access endpoint
- Scoring: If match is FINISHED with scores, auto-calculate points using existing scoring logic
- Only admin (single user) can load predictions retroactively
- This is a PoC with friends — UI doesn't need to be perfect but must be functional

---

## Files to Create/Modify

### New/Modified Files:
- **Prisma schema:** `apps/api/prisma/schema.prisma` — Add `loadedByAdmin` field to Prediction model
- **Migration:** `apps/api/prisma/migrations/[timestamp]_add_loaded_by_admin/migration.sql` — Auto-generated
- **Backend endpoint:** `apps/api/src/routes/predictions.ts` — Add admin load endpoint
- **Admin API client:** `apps/web/lib/api.ts` — Add client method for admin prediction load
- **Admin UI:** `apps/web/app/admin/page.tsx` — Add new section "Cargar Pronósticos Retroactivos"

---

## Task Breakdown

### Task 1: Add `loadedByAdmin` Field to Prisma Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma:108-123` (Prediction model)

**Interfaces:**
- Consumes: None (schema modification)
- Produces: Updated Prediction model with `loadedByAdmin: Boolean @default(false)`

- [ ] **Step 1: Open Prisma schema**

Read `apps/api/prisma/schema.prisma` to see current Prediction model structure (lines 108-123).

- [ ] **Step 2: Add loadedByAdmin field**

Replace the Prediction model with the updated version that includes the new field:

```prisma
model Prediction {
  id                 String   @id @default(uuid())
  userId             String
  matchId            String
  leagueId           String
  predictedHomeScore Int
  predictedAwayScore Int
  pointsEarned       Int?
  loadedByAdmin      Boolean  @default(false)
  createdAt          DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  match  Match  @relation(fields: [matchId], references: [id], onDelete: Cascade)
  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([userId, matchId, leagueId])
}
```

- [ ] **Step 3: Create and run migration**

Run from `apps/api` directory:

```bash
npx prisma migrate dev --name add_loaded_by_admin
```

Expected: Prisma generates migration file, updates Prisma client, no errors.

- [ ] **Step 4: Verify schema**

Run:
```bash
npx prisma db push
```

Expected: No errors, schema updated in database.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma "apps/api/prisma/migrations/"
git commit -m "feat: add loadedByAdmin field to Prediction model"
```

---

### Task 2: Create Admin Endpoint `POST /api/predictions/admin-load`

**Files:**
- Modify: `apps/api/src/routes/predictions.ts:1-104`

**Interfaces:**
- Consumes: 
  - `Match.status` (LIVE | FINISHED | SCHEDULED)
  - `Match.homeScore`, `Match.awayScore` (may be null)
  - `Prediction` model with new `loadedByAdmin` field
- Produces: 
  - Endpoint: `POST /api/predictions/admin-load`
  - Input: `{ matchId: string; userId: string; leagueId: string; predictedHomeScore: number; predictedAwayScore: number }`
  - Output: `{ id, userId, matchId, leagueId, predictedHomeScore, predictedAwayScore, pointsEarned, loadedByAdmin, createdAt }`
  - Errors: 400 if match is SCHEDULED, 404 if match not found, 403 if not admin, 400 if user already has prediction

- [ ] **Step 1: Write failing test for admin endpoint**

Create file `apps/api/src/routes/predictions.test.ts`:

```typescript
import request from 'supertest'
import app from '../app'
import { prisma } from '../lib/prisma'

describe('POST /predictions/admin-load', () => {
  let adminToken: string
  let normalToken: string
  let matchId: string
  let userId: string
  let leagueId: string

  beforeAll(async () => {
    // Create admin, normal user, match, league for tests
    // (mock setup — in real test would use fixtures)
  })

  test('admin can load prediction for LIVE match', async () => {
    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchId,
        userId,
        leagueId,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.loadedByAdmin).toBe(true)
    expect(res.body.predictedHomeScore).toBe(2)
  })

  test('blocks normal user from loading predictions', async () => {
    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${normalToken}`)
      .send({
        matchId,
        userId,
        leagueId,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    expect(res.status).toBe(403)
  })

  test('blocks loading for SCHEDULED match', async () => {
    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchId: scheduledMatchId,
        userId,
        leagueId,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('no ha comenzado')
  })

  test('blocks loading if user already has prediction', async () => {
    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchId,
        userId: userWithExistingPred,
        leagueId,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('ya tiene pronóstico')
  })

  test('auto-scores prediction if match is FINISHED', async () => {
    // Create FINISHED match with scores 2-1
    const finishedMatch = await prisma.match.create({
      data: {
        id: 'finished-' + Date.now(),
        stage: 'GROUP',
        homeTeam: 'A',
        awayTeam: 'B',
        matchDate: new Date(),
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
        isActive: true,
      },
    })

    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchId: finishedMatch.id,
        userId,
        leagueId,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    expect(res.status).toBe(201)
    expect(res.body.pointsEarned).toBe(3) // Exact match = 3 points
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api
npm test -- src/routes/predictions.test.ts
```

Expected: FAIL — endpoint doesn't exist.

- [ ] **Step 3: Implement admin endpoint**

Open `apps/api/src/routes/predictions.ts` and add this new route after line 45 (after the normal POST endpoint):

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api
npm test -- src/routes/predictions.test.ts
```

Expected: PASS all tests (or adjust test mocks as needed).

- [ ] **Step 5: Manual test with curl**

Start your API locally, then:

```bash
curl -X POST http://localhost:3001/predictions/admin-load \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "valid-match-uuid",
    "userId": "valid-user-uuid",
    "leagueId": "valid-league-uuid",
    "predictedHomeScore": 2,
    "predictedAwayScore": 1
  }'
```

Expected: 201 with prediction object, `loadedByAdmin: true`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/predictions.ts apps/api/src/routes/predictions.test.ts
git commit -m "feat: add admin endpoint POST /predictions/admin-load for retroactive predictions"
```

---

### Task 3: Add Admin API Client Method

**Files:**
- Modify: `apps/web/lib/api.ts`

**Interfaces:**
- Consumes: Backend endpoint `POST /api/predictions/admin-load`
- Produces: Function `adminLoadPrediction(matchId, userId, leagueId, homeScore, awayScore): Promise<Prediction>`

- [ ] **Step 1: Check current adminApi structure**

Read `apps/web/lib/api.ts` to see how other admin methods are structured (search for `adminApi` or similar).

- [ ] **Step 2: Add adminLoadPrediction method**

Find the admin API section and add:

```typescript
export const adminApi = {
  // ... existing methods ...

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

  // Get all users for admin dropdown
  async users(): Promise<{ id: string; username: string }[]> {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },

  // Get all leagues for admin dropdown
  async allLeagues(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${API_BASE}/admin/leagues`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },
}
```

- [ ] **Step 3: Verify types match backend response**

The backend returns a full Prediction object. Ensure your TypeScript types match (or define if missing):

```typescript
export interface Prediction {
  id: string
  userId: string
  matchId: string
  leagueId: string
  predictedHomeScore: number
  predictedAwayScore: number
  pointsEarned?: number | null
  loadedByAdmin: boolean
  createdAt: string
}
```

- [ ] **Step 4: Test in browser console (after UI is built)**

After task 4, you'll be able to test: `await adminApi.loadPredictionForUser(matchId, userId, leagueId, 2, 1)`

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api.ts
git commit -m "feat: add adminLoadPredictionForUser method to admin API client"
```

---

### Task 4: Add UI Section to Admin Panel

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

**Interfaces:**
- Consumes: 
  - `adminApi.matches()` — returns Match[]
  - `adminApi.users()` — returns { id, username }[]
  - `adminApi.loadPredictionForUser(matchId, userId, leagueId, homeScore, awayScore)` — from Task 3
  - Current match data with status: SCHEDULED | LIVE | FINISHED
- Produces: New UI section "Cargar Pronósticos Retroactivos" with:
  - Match selector (filters LIVE + FINISHED only)
  - User selector (from admin.users())
  - League selector (all leagues)
  - Score inputs (home, away)
  - Load button
  - Success/error messages

- [ ] **Step 1: Create RetroactivePredictionSection component**

Add this new component at the end of `apps/web/app/admin/page.tsx` (before the closing brace):

```typescript
function RetroactivePredictionSection() {
  const [matches, setMatches] = useState<Match[]>([])
  const [users, setUsers] = useState<{ id: string; username: string }[]>([])
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedLeague, setSelectedLeague] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    Promise.all([
      adminApi.matches(),
      adminApi.users(),
      adminApi.allLeagues(),
    ])
      .then(([m, u, l]) => {
        // Filter only LIVE and FINISHED matches
        const filtered = m.filter((match) => match.status === 'LIVE' || match.status === 'FINISHED')
        setMatches(filtered)
        setUsers(u)
        setLeagues(l)
        if (filtered.length > 0) setSelectedMatch(filtered[0].id)
        if (u.length > 0) setSelectedUser(u[0].id)
        if (l.length > 0) setSelectedLeague(l[0].id)
      })
      .catch((err) => {
        setMessageType('error')
        setMessage(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleLoad() {
    if (!selectedMatch || !selectedUser || !selectedLeague || homeScore === '' || awayScore === '') {
      setMessageType('error')
      setMessage('Complete todos los campos')
      return
    }

    setLoadingSubmit(true)
    setMessage('')
    try {
      const result = await adminApi.loadPredictionForUser(
        selectedMatch,
        selectedUser,
        selectedLeague,
        parseInt(homeScore),
        parseInt(awayScore)
      )
      setMessageType('success')
      setMessage(
        `✅ Pronóstico cargado para ${users.find((u) => u.id === selectedUser)?.username ?? selectedUser}. ` +
        `Puntos: ${result.pointsEarned ?? 0}`
      )
      setHomeScore('')
      setAwayScore('')
    } catch (err: any) {
      setMessageType('error')
      setMessage(err.message || 'Error al cargar pronóstico')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const selectedMatchObj = matches.find((m) => m.id === selectedMatch)

  if (loading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold">Cargar Pronósticos Retroactivos</h2>
        <p className="text-xs text-zinc-600">Cargando...</p>
      </section>
    )
  }

  if (matches.length === 0) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold">Cargar Pronósticos Retroactivos</h2>
        <p className="text-xs text-zinc-600">No hay partidos en vivo o finalizados disponibles</p>
      </section>
    )
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-white font-semibold">Cargar Pronósticos Retroactivos</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Cargá pronósticos manualmente para usuarios que no alcanzaron a hacerlo por diferencia horaria
        </p>
      </div>

      <div className="space-y-3">
        {/* Match selector */}
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">Partido</label>
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam} vs {m.awayTeam} ({m.status === 'LIVE' ? 'En vivo' : 'Finalizado'})
              </option>
            ))}
          </select>
          {selectedMatchObj && (
            <p className="text-xs text-zinc-500 mt-1">
              📅 {new Date(selectedMatchObj.matchDate).toLocaleDateString('es-AR')}
              {selectedMatchObj.homeScore !== null && selectedMatchObj.awayScore !== null && (
                <span className="ml-2">
                  Resultado: {selectedMatchObj.homeScore} - {selectedMatchObj.awayScore}
                </span>
              )}
            </p>
          )}
        </div>

        {/* User selector */}
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">Usuario</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                @{u.username}
              </option>
            ))}
          </select>
        </div>

        {/* League selector */}
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">Liga</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Score inputs */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 font-medium block mb-1.5">Goles locales</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center font-bold focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex items-end pb-2 text-zinc-600 font-bold">–</div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 font-medium block mb-1.5">Goles visitante</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center font-bold focus:border-sky-500 outline-none"
            />
          </div>
        </div>

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={loadingSubmit || !selectedMatch || !selectedUser || !selectedLeague}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingSubmit ? 'Cargando...' : 'Cargar pronóstico'}
        </button>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs text-center ${
              messageType === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add RetroactivePredictionSection to main admin page**

Find the main `AdminPage` component's return statement (around line 158) and add the new section. Add it after the "Gestión de etapas" section and before "Sincronización automática":

```typescript
{/* Sección: Cargar pronósticos retroactivos */}
<RetroactivePredictionSection />
```

So the order looks like:
```
<main>
  ... Setup inicial ...
  ... Gestión de etapas ...
  <RetroactivePredictionSection />
  ... Sincronización automática ...
  ... User management ...
  ... Reports ...
  ... Reset ...
</main>
```

- [ ] **Step 3: Test the UI**

Start the dev server locally:

```bash
cd apps/web
npm run dev
```

Navigate to `/admin`, verify:
- New section "Cargar Pronósticos Retroactivos" appears
- Match dropdown shows only LIVE/FINISHED matches
- User and League dropdowns populate correctly
- Can enter scores and click "Cargar pronóstico"
- Success/error messages appear

- [ ] **Step 4: Test end-to-end**

1. Find a match that's LIVE or FINISHED
2. Select a user who hasn't predicted for that match yet
3. Select a league they're in
4. Enter scores
5. Click load
6. Verify prediction appears in database (check admin panel or query DB directly)
7. If match is FINISHED with scores, verify points were awarded

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "feat: add retroactive prediction loader to admin panel"
```

---

### Task 5: Verify Backend Endpoints Exist (dependencies for admin API)

**Files:**
- Check: `apps/api/src/routes/admin.ts`

**Interfaces:**
- Verify these endpoints exist and return correct types:
  - `GET /admin/users` → `{ id, username }[]`
  - `GET /admin/leagues` → `{ id, name }[]`
  - `GET /admin/matches` → `Match[]`

- [ ] **Step 1: Check existing admin endpoints**

Read `apps/api/src/routes/admin.ts` to verify the three endpoints exist.

- [ ] **Step 2: Add missing endpoints if needed**

If `GET /admin/users`, `GET /admin/leagues`, or `GET /admin/matches` don't exist, add them:

```typescript
// In admin.ts

// Get all users (for admin dropdowns)
router.get('/users', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.isAdmin) throw new AppError(403, 'Solo admins')

    const users = await prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

// Get all leagues (for admin dropdowns)
router.get('/leagues', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.isAdmin) throw new AppError(403, 'Solo admins')

    const leagues = await prisma.league.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json(leagues)
  } catch (err) {
    next(err)
  }
})

// Get all matches for admin (with full data)
router.get('/matches', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user?.isAdmin) throw new AppError(403, 'Solo admins')

    const matches = await prisma.match.findMany({
      where: { isActive: true },
      orderBy: { matchDate: 'asc' },
    })
    res.json(matches)
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 3: Test endpoints locally**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:3001/admin/users
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:3001/admin/leagues
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:3001/admin/matches
```

Expected: JSON arrays with correct fields.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin.ts
git commit -m "feat: add GET /admin/users, /admin/leagues, /admin/matches endpoints"
```

---

### Task 6: Integration Test — Full Flow

**Files:**
- Test: `apps/api/src/routes/predictions.test.ts` (extend from Task 2)

**Interfaces:**
- Uses: All endpoints from Task 2, Task 5

- [ ] **Step 1: Write integration test**

Add a full-flow test to `predictions.test.ts`:

```typescript
describe('Full retroactive prediction flow', () => {
  test('admin loads prediction for user, it gets scored if match is finished', async () => {
    // 1. Create test data: admin user, normal user, league, finished match with scores
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin_test',
        passwordHash: 'hash',
        isAdmin: true,
      },
    })

    const normalUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        username: 'normal_user',
        passwordHash: 'hash',
      },
    })

    const league = await prisma.league.create({
      data: { name: 'Test League', inviteCode: 'TEST' + Date.now(), ownerId: admin.id },
    })

    await prisma.leagueMember.create({
      data: { leagueId: league.id, userId: normalUser.id },
    })

    const finishedMatch = await prisma.match.create({
      data: {
        stage: 'GROUP',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        matchDate: new Date(),
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
        isActive: true,
      },
    })

    // 2. Admin loads exact prediction (2-1)
    const adminToken = 'valid_admin_token' // mock
    const res = await request(app)
      .post('/predictions/admin-load')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        matchId: finishedMatch.id,
        userId: normalUser.id,
        leagueId: league.id,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      })

    // 3. Verify prediction was created with correct points
    expect(res.status).toBe(201)
    expect(res.body.pointsEarned).toBe(3) // Exact match
    expect(res.body.loadedByAdmin).toBe(true)

    // 4. Verify points were awarded to user
    const updatedMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId: normalUser.id } },
    })
    expect(updatedMember?.totalPoints).toBe(3)
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
cd apps/api
npm test -- src/routes/predictions.test.ts
```

Expected: PASS all tests.

- [ ] **Step 3: Manual end-to-end test in browser**

1. Start API: `cd apps/api && npm run dev`
2. Start Web: `cd apps/web && npm run dev`
3. Login as admin
4. Go to `/admin`
5. Find a LIVE or FINISHED match
6. Select a user and league
7. Enter scores
8. Click "Cargar pronóstico"
9. Verify success message appears
10. Check the user's predictions (navigate to their profile or query DB)
11. Verify prediction is there with correct points (if FINISHED)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/predictions.test.ts
git commit -m "test: add full integration test for retroactive prediction loading"
```

---

### Task 7: Final Verification and Cleanup

- [ ] **Step 1: Run all tests**

```bash
cd apps/api
npm test
```

Expected: All tests pass, no new warnings.

- [ ] **Step 2: Check TypeScript compilation**

```bash
cd apps/web
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Check database migration is clean**

```bash
cd apps/api
npx prisma db push
```

Expected: Already in sync (no pending migrations).

- [ ] **Step 4: Verify loadedByAdmin field is in schema**

```bash
cd apps/api
npx prisma studio
```

Open Prediction table, verify `loadedByAdmin` column exists with default `false`.

- [ ] **Step 5: Clean up any console logs or debug code**

Search for `console.log` or `TODO` in your changes and remove.

- [ ] **Step 6: Final commit**

```bash
git log --oneline -7
```

Verify you have 7 clean commits:
1. Add loadedByAdmin field
2. Admin endpoint implementation
3. Admin API client method
4. Admin UI section
5. Admin route endpoints
6. Integration test
7. (optional cleanup)

---

## Summary

After completing all tasks:

✅ **Prisma schema** updated with `loadedByAdmin` boolean field  
✅ **Backend endpoint** `POST /api/predictions/admin-load` validates LIVE/FINISHED, prevents duplicates, auto-scores if match is finished  
✅ **Admin API client** method to call the new endpoint  
✅ **Admin UI section** with match/user/league selectors and score inputs  
✅ **Supporting endpoints** `GET /admin/users`, `GET /admin/leagues`, `GET /admin/matches`  
✅ **Tests** verify endpoint works correctly and full flow succeeds  

**Result:** Admin can manually load pronósticos for users who missed the deadline due to timezone issues.

---

## Testing Checklist

Before merging to main:
- [ ] All unit tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Manual end-to-end test in browser succeeds
- [ ] Tried loading prediction for LIVE match (no scoring yet)
- [ ] Tried loading prediction for FINISHED match with scores (points awarded)
- [ ] Error cases tested (user already has prediction, match is SCHEDULED, user not member of league)
- [ ] Admin-only check verified (normal user gets 403)
