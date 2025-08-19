// backend/routes/report.js
import express from 'express'
import Report from '../models/report.js'

const router = express.Router()

// 全部（簡表）
router.get('/', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 })
  res.json(list)
})

// 取某日
router.get('/:date', async (req, res) => {
  const { date } = req.params
  const r = await Report.findOne({ date })
  if (!r) return res.json(null)
  res.json(r)
})

// 建立/覆蓋某日報表（新欄位：stallFee/parkingFee/insuranceFee）
router.post('/', async (req, res) => {
  try {
    const { date, items = [], stallFee = 0, parkingFee = 0, insuranceFee = 0, netProfit = 0 } = req.body
    if (!date) return res.status(400).json({ error: '缺少日期' })

    const doc = await Report.findOneAndUpdate(
      { date },
      {
        date,
        items,
        stallFee: Number(stallFee || 0),
        parkingFee: Number(parkingFee || 0),
        insuranceFee: Number(insuranceFee || 0),
        netProfit: Number(netProfit || 0)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message || '儲存報表失敗' })
  }
})

// 刪某日
router.delete('/:date', async (req, res) => {
  const { date } = req.params
  await Report.deleteOne({ date })
  res.json({ ok: true })
})

export default router
