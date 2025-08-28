// backend/server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import https from 'https'
import dns from 'dns'

import InRoutes from './routes/in.js'
import OutRoutes from './routes/out.js'
import ReportRoutes from './routes/report.js'
import ItemRoutes from './routes/item.js'

dotenv.config()
dns.setDefaultResultOrder?.('ipv4first') // 避免某些環境 IPv6 解析拖慢連線

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

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
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// ---- 環境變數 ----
const PORT = Number(process.env.PORT) || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erpdb'
const SELF_PING_URL = process.env.SELF_PING_URL || '' // 例如 https://your-backend.onrender.com/health
const SELF_PING_INTERVAL_SEC = Number(process.env.SELF_PING_INTERVAL_SEC || 300) // 預設 5 分
const SELF_PING_TIMEOUT_MS = Number(process.env.SELF_PING_TIMEOUT_MS || 5000)    // 喚醒逾時

mongoose.set('strictQuery', true)

// ---- 連線資料庫 ----
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  maxPoolSize: 10,
  minPoolSize: 1
})
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`)
      // 調整 Keep-Alive，降低連線重建成本
      server.keepAliveTimeout = 65_000
      server.headersTimeout = 66_000
      // 啟動後安排自我喚醒
      scheduleSelfPing()
    })
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err)
    process.exit(1)
  })

process.on('SIGINT', async () => {
  try { await mongoose.connection.close() } finally { process.exit(0) }
})

/* ---------------- 自我喚醒：定時呼叫 /health ---------------- */

function scheduleSelfPing () {
  if (!SELF_PING_URL) {
    console.log('ℹ️ SELF_PING_URL 未設定，略過自我喚醒')
    return
  }
  console.log(`🛎  自我喚醒已啟動：每 ${SELF_PING_INTERVAL_SEC}s ping ${SELF_PING_URL}`)

  // 啟動後延遲 10s 先 ping 一次
  setTimeout(() => safePing(SELF_PING_URL, SELF_PING_TIMEOUT_MS), 10_000)
  // 之後固定頻率維持喚醒
  setInterval(() => safePing(SELF_PING_URL, SELF_PING_TIMEOUT_MS), SELF_PING_INTERVAL_SEC * 1000)
}

function safePing (urlStr, timeoutMs = 5000) {
  try {
    const u = new URL(urlStr)
    const isHttps = u.protocol === 'https:'
    const mod = isHttps ? https : http

    const agent = isHttps
      ? new https.Agent({ keepAlive: true, timeout: timeoutMs })
      : new http.Agent({ keepAlive: true, timeout: timeoutMs })

    const req = mod.request({
      method: 'GET',
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: `${u.pathname}${u.search || ''}`,
      agent,
      timeout: timeoutMs,
      headers: { 'user-agent': 'erp-self-ping/1.0' }
    }, (res) => {
      // 消耗回應避免 socket 佔用
      res.resume()
    })

    req.on('timeout', () => req.destroy())
    req.on('error', () => { /* 靜默錯誤：喚醒用途，失敗可忽略 */ })
    req.end()
  } catch {
    // 忽略格式錯誤或其他例外
  }
}
