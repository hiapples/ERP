import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import InRoutes from './routes/in.js'
import OutRoutes from './routes/out.js'
import ReportRoutes from './routes/report.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ ok: true, hint: 'ERP API online. Try /records, /outrecords, /reports' })
})

// API 路由（不加 /api 前綴）
app.use('/records', InRoutes)
app.use('/outrecords', OutRoutes)
app.use('/reports', ReportRoutes)

// 服務前端靜態檔（Render 上 Root Directory 設為 backend）
const distPath = path.resolve(__dirname, '../frontend/dist')
app.use(express.static(distPath))

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb'

mongoose.set('strictQuery', true)

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`)
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
