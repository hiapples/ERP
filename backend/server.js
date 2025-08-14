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

// ====== Base middlewares ======
app.use(cors())                  // 如需白名單：cors({ origin: ['https://你的網域'] })
app.use(express.json())

// ====== Path helpers (ESM __dirname) ======
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ====== Health & root (可選擇導向 /health) ======
app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/', (_req, res) => {
  res.json({ ok: true, hint: 'ERP API online. Try /records, /outrecords, /reports' })
  // 若想直接顯示前端首頁，改成：
  // res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})

// ====== Serve frontend static files ======
const distDir = path.join(__dirname, '../frontend/dist')
app.use(express.static(distDir))

// ====== API routes (注意：在 fallback 之前) ======
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// ====== Frontend SPA fallback (非 /api 類路由一律回 index.html) ======
app.get('*', (req, res, next) => {
  // 若是打 API 路徑就放行到 404/下一個 middleware
  if (req.path.startsWith('/records') || req.path.startsWith('/outrecords') || req.path.startsWith('/reports') || req.path.startsWith('/health')) {
    return next()
  }
  res.sendFile(path.join(distDir, 'index.html'))
})

// ====== 404 JSON（給未命中的 API）======
app.use((req, res, next) => {
  if (req.xhr || req.path.startsWith('/records') || req.path.startsWith('/outrecords') || req.path.startsWith('/reports') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'Not Found', path: req.path })
  }
  next()
})

// ====== Error handler ======
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

// ====== DB & server bootstrap ======
const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb'

mongoose.set('strictQuery', true)

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    retryWrites: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on :${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err)
    process.exit(1)
  })

// 優雅關機
const shutdown = async (signal) => {
  console.log(`\n${signal} received, closing...`)
  try {
    await mongoose.connection.close()
  } finally {
    process.exit(0)
  }
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
