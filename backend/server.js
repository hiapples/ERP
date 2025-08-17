// backend/server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import InRoutes from './routes/in.js'
import OutRoutes from './routes/out.js'
import ReportRoutes from './routes/report.js'
import ItemRoutes from './routes/item.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

// 分開路由
app.use('/records', InRoutes)          // 入庫
app.use('/outrecords', OutRoutes)      // 出庫
app.use('/reports', ReportRoutes)      // 報表
app.use('/items', ItemRoutes)          // 品項

// ---- 靜態檔（前端打包後） ----
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDist = path.resolve(__dirname, '../frontend/dist')

app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erpdb'
mongoose.set('strictQuery', true)

mongoose.connect(MONGO_URI)
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
  try { await mongoose.connection.close() } finally { process.exit(0) }
})
