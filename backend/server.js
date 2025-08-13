import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import In from './routes/in.js'
import Out from './routes/out.js'
import ReportRoutes from './routes/report.js'

dotenv.config()

const app = express()

// CORS & JSON
app.use(cors())
app.use(express.json())

// 健康檢查（無 /api 前綴）
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// 路由（無 /api 前綴）
app.use('/records', In)
app.use('/outrecords', Out)
app.use('/reports', ReportRoutes)

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb'

mongoose.set('strictQuery', true)

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`)
      console.log(`   Health: http://localhost:${PORT}/health`)
    })
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err)
    process.exit(1)
  })

// 優雅關閉
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close()
  } finally {
    process.exit(0)
  }
})
