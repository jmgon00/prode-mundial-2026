import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import leagueRoutes from './routes/leagues'
import matchRoutes from './routes/matches'
import predictionRoutes from './routes/predictions'
import rankingRoutes from './routes/rankings'
import adminRoutes from './routes/admin'
import userRoutes from './routes/users'
import badgeRoutes from './routes/badges'
import statsRoutes from './routes/stats'
import funBetsRoutes from './routes/funbets'
import groupsRoutes from './routes/groups'
import { syncWorldCupResults } from './services/worldcup-sync'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/leagues', leagueRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/rankings', rankingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/badges', badgeRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/funbets', funBetsRoutes)
app.use('/api/groups', groupsRoutes)

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`Backend corriendo en http://localhost:${env.PORT}`)
  // Auto-sync con worldcup26.ir cada 3 minutos
  setInterval(() => {
    syncWorldCupResults().catch((err) => console.error('[auto-sync] Error:', err.message))
  }, 3 * 60 * 1000)
})
