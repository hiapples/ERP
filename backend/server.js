import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import In from './routes/in.js'
import Out from './routes/out.js'
import ReportRoutes from './routes/report.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// 健康檢查
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// API 路由
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// 若你想用同一個服務同時提供前端（可選）：
// 把前端 build 後的 dist 放到 ../frontend/dist，再設置環境變數 SERVE_STATIC=true
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'frontend', 'dist')
if (process.env.SERVE_STATIC === 'true') {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  // 友善首頁：提示可用的 API
  app.get('/', (_req, res) => {
    res.json({ ok: true, hint: 'ERP API online. Try /health, /records, /outrecords, /reports' })
  })
}

const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb'

mongoose.set('strictQuery', true)

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err)
    process.exit(1)
  })

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close()
  } finally {
    process.exit(0)
  }
})
