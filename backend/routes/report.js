import express from 'express'
import Report from '../models/report.js'

const router = express.Router()

// 全部報表
router.get('/', async (_req, res) => {
  const list = await Report.find({}).sort({ date: -1 })
  res.json(list)
})

// 單日報表
router.get('/:date', async (req, res) => {
  const { date } = req.params
  const doc = await Report.findOne({ date })
  res.json(doc)
})

// 新增/覆蓋（同日期 upsert）
router.post('/', async (req, res) => {
  const { date, qtyCake, qtyJuice, fixedExpense, extraExpense, netProfit } = req.body || {}
  if (!date) return res.status(400).json({ error: 'date is required' })
  const doc = await Report.findOneAndUpdate(
    { date },
    {
      $set: {
        qtyCake: Number(qtyCake || 0),
        qtyJuice: Number(qtyJuice || 0),
        fixedExpense: Number(fixedExpense || 0),
        extraExpense: Number(extraExpense || 0),
        netProfit: Number(netProfit || 0)
      }
    },
    { new: true, upsert: true }
  )
  res.json(doc)
})

// 刪除單日報表
router.delete('/:date', async (req, res) => {
  const { date } = req.params
  await Report.deleteOne({ date })
  res.json({ ok: true })
})

export default router
