// backend/server.js
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

// --- API (先掛 API 路由) ---
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// --- 靜態檔案 (前端打包後的 dist) ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDist = path.resolve(__dirname, '../frontend/dist')

// 提供 /assets/*、/index.html 等靜態檔案
app.use(express.static(clientDist))

// SPA fallback：把非 API 的路由都回傳 index.html，讓前端路由接手
app.get('*', (req, res) => {
  // 避免誤攔 API/健康檢查（已在上面先行匹配，不會進到這裡）
  res.sendFile(path.join(clientDist, 'index.html'))
})

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
