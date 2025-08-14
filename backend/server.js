// backend/server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// API routes
import In from './routes/in.js'
import Out from './routes/out.js'
import ReportRoutes from './routes/report.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ===== Path helpers (ESM __dirname) =====
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, '../frontend/dist')

// ===== 靜態檔與首頁（一定放在 API 路由前）=====
app.use(express.static(distDir))
app.get('/', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// ===== 健康檢查 =====
app.get('/health', (_req, res) => res.json({ ok: true }))

// ===== API 路由（保持你原本路徑）=====
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// ===== SPA fallback（非 API/health 路徑都回前端）=====
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/records') ||
    req.path.startsWith('/outrecords') ||
    req.path.startsWith('/reports') ||
    req.path.startsWith('/health')
  ) return next()
  res.sendFile(path.join(distDir, 'index.html'))
})

// ===== 404（只針對未命中的 API 回 JSON）=====
app.use((req, res, next) => {
  if (
    req.path.startsWith('/records') ||
    req.path.startsWith('/outrecords') ||
    req.path.startsWith('/reports') ||
    req.path.startsWith('/health')
  ) return res.status(404).json({ error: 'Not Found', path: req.path })
  next()
})

// ===== Error handler =====
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

// ===== DB & server bootstrap =====
const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb'
mongoose.set('strictQuery', true)

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000, retryWrites: true })
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server on :${PORT}`))
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err)
    process.exit(1)
  })

// 優雅關機
const shutdown = async (signal) => {
  console.log(`${signal} received, closing...`)
  try { await mongoose.connection.close() } finally { process.exit(0) }
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
