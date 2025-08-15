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

// 嘗試服務前端（如果有打包好的檔案）
const distDir = path.resolve(__dirname, '../frontend/dist')
app.use(express.static(distDir))

app.get('/', (_req, res) => {
  try {
    res.sendFile(path.join(distDir, 'index.html'))
  } catch {
    res.json({ ok: true, hint: 'ERP API online. Try /records, /outrecords, /reports' })
  }
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
