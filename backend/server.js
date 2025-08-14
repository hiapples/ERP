import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import In from './routes/in.js'
import Out from './routes/out.js'
import ReportRoutes from './routes/report.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// === ✅ 根路徑不要 404（擇一：回提示 或 redirect 到 /health） ===
app.get('/', (_req, res) => {
  // 回一段提示字樣
  res.json({ ok: true, hint: 'ERP API online. Try /health, /records, /outrecords, /reports' })
  // 或者想導向 /health 就改成：
  // res.redirect('/health')
})

// 健康檢查
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// 路由（不要 /api）
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// === ✅ 統一 404 JSON（放在所有路由後面） ===
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path })
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
