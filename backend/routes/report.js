import { Router } from 'express'
import Report from '../models/report.js'

const router = Router()

// 取得全部報表（新到舊）
router.get('/', async (_req, res) => {
  try {
    const list = await Report.find().sort({ date: -1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 取得單日報表
router.get('/:date', async (req, res) => {
  try {
    const doc = await Report.findOne({ date: req.params.date })
    if (!doc) return res.status(404).json({ error: 'not found' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 新增/覆寫單日報表（以 date 覆蓋）
router.post('/', async (req, res) => {
  try {
    const { date, qtyCake = 0, qtyJuice = 0, fixedExpense = 0, extraExpense = 0, netProfit = 0 } = req.body
    if (!date) return res.status(400).json({ error: 'date is required' })

    const doc = await Report.findOneAndUpdate(
      { date },
      { date, qtyCake, qtyJuice, fixedExpense, extraExpense, netProfit },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json({ ok: true, _id: doc._id })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// 刪除單日報表
router.delete('/:date', async (req, res) => {
  try {
    await Report.findOneAndDelete({ date: req.params.date })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
