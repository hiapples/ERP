import { Router } from 'express'
import Report from '../models/report.js'

const router = Router()

// 建立/更新（同一天覆蓋）
router.post('/', async (req, res) => {
  try {
    const { date, ...rest } = req.body
    if (!date) return res.status(400).json({ error: 'date is required' })
    const doc = await Report.findOneAndUpdate(
      { date },
      { date, ...rest },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.json({ ok: true, _id: doc._id })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 取得全部
router.get('/', async (_req, res) => {
  try {
    const list = await Report.find({}).sort({ date: -1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 取得單日
router.get('/:date', async (req, res) => {
  try {
    const doc = await Report.findOne({ date: req.params.date })
    res.json(doc || null)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 刪除單日
router.delete('/:date', async (req, res) => {
  try {
    await Report.findOneAndDelete({ date: req.params.date })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
