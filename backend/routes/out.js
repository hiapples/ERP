import { Router } from 'express'
import OutRecord from '../models/out.js'

const router = Router()

// 新增出庫（支援單筆或陣列）
router.post('/', async (req, res) => {
  try {
    const body = req.body
    if (Array.isArray(body)) {
      const docs = await OutRecord.insertMany(body)
      return res.json({ inserted: docs.length })
    } else {
      const doc = await OutRecord.create(body)
      return res.json({ inserted: 1, _id: doc._id })
    }
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 查詢出庫
router.get('/', async (req, res) => {
  try {
    const { date, item } = req.query
    const q = {}
    if (date) q.date = date
    if (item) q.item = item
    const list = await OutRecord.find(q).sort({ createdAt: -1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新出庫
router.put('/:id', async (req, res) => {
  try {
    await OutRecord.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 刪除出庫
router.delete('/:id', async (req, res) => {
  try {
    await OutRecord.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 報表：單日銷貨成本（整筆金額加總）
router.get('/total/:date', async (req, res) => {
  try {
    const { date } = req.params
    const list = await OutRecord.find({ date })

    let totalGroup1 = 0
    let totalGroup2 = 0

    for (const r of list) {
      const cost = Number(r.price) || 0 // 整筆金額
      if (r.item === '檸檬汁') totalGroup1 += cost
      else if (r.item === '蘋果汁') totalGroup2 += cost
    }

    res.json({ totalGroup1, totalGroup2 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
