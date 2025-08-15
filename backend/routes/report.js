// backend/routes/report.js
import { Router } from 'express'
import Report from '../models/report.js'

const router = Router()

// 列表
router.get('/', async (_req, res) => {
  const list = await Report.find({}).sort({ date: -1 })
  res.json(list)
})

// 讀單日
router.get('/:date', async (req, res) => {
  const doc = await Report.findOne({ date: req.params.date })
  res.json(doc || null)
})

// 新增/覆蓋（依 date upsert）
router.post('/', async (req, res) => {
  const { date, qtyCake, qtyJuice, fixedExpense, extraExpense, netProfit } = req.body
  const doc = await Report.findOneAndUpdate(
    { date },
    {
      date,
      qtyCake: Number(qtyCake || 0),
      qtyJuice: Number(qtyJuice || 0),
      fixedExpense: Number(fixedExpense || 0),
      extraExpense: Number(extraExpense || 0),
      netProfit: Number(netProfit || 0)
    },
    { new: true, upsert: true }
  )
  res.json({ ok: true, id: doc._id })
})

// 依日期刪除
router.delete('/:date', async (req, res) => {
  await Report.findOneAndDelete({ date: req.params.date })
  res.json({ ok: true })
})

export default router
