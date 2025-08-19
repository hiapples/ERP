import { Router } from 'express'
import Report from '../models/Report.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())

// 取得全部（排序新到舊）
router.get('/', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 }).lean()
  res.json(list)
})

// 取得某日
router.get('/:date', async (req, res) => {
  const date = norm(req.params.date)
  const doc = await Report.findOne({ date }).lean()
  res.json(doc || null)
})

// 新增/覆寫（以 date upsert）
router.post('/', async (req, res) => {
  const b = req.body || {}
  const date = norm(b.date)
  const payload = {
    date,
    items: Array.isArray(b.items) ? b.items.map(r => ({
      item: norm(r.item),
      qty: Number(r.qty || 0)
    })) : [],
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),
    netProfit: Number(b.netProfit || 0)
  }
  await Report.updateOne({ date }, { $set: payload }, { upsert: true })
  const saved = await Report.findOne({ date }).lean()
  res.json(saved)
})

// 刪除某日
router.delete('/:date', async (req, res) => {
  const date = norm(req.params.date)
  await Report.deleteOne({ date })
  res.json({ ok: true })
})

export default router
