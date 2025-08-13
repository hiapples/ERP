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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 若完全同源可關掉 CORS；保守起見先留著
app.use(cors())
app.use(express.json())

// --- API 路由（不要 /api 前綴） ---
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// --- 靜態檔案（前端 dist） ---
// 重要：請先把前端 build 到 backend/dist（下方會教 vite 設定）
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

// 對 SPA 的 fallback，讓前端路由可直接刷新
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// --- DB & 啟動 ---
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
