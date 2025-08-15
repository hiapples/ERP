import { Router } from 'express'
import InRecord from '../models/in.js'

const router = Router()

// 新增入庫（支援單筆或陣列）
router.post('/', async (req, res) => {
  try {
    const body = req.body
    if (Array.isArray(body)) {
      const docs = await InRecord.insertMany(body)
      return res.json({ inserted: docs.length })
    } else {
      const doc = await InRecord.create(body)
      return res.json({ inserted: 1, _id: doc._id })
    }
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 查詢入庫
router.get('/', async (req, res) => {
  try {
    const { date, item } = req.query
    const q = {}
    if (date) q.date = date
    if (item) q.item = item
    const list = await InRecord.find(q).sort({ createdAt: -1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新入庫
router.put('/:id', async (req, res) => {
  try {
    await InRecord.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 刪除入庫
router.delete('/:id', async (req, res) => {
  try {
    await InRecord.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
