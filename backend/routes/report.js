import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'
import OutRecord from '../models/out.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const to2 = (n) => Math.round(Number(n || 0) * 100) / 100

// 取得全部（排序新到舊）+ 當天營收/成本
router.get('/', async (_req, res) => {
  // 1) 報表列表
  const list = await Report.find().sort({ date: -1 }).lean()

  // 2) 成品價目&耗材對照
  const products = await Item.find({ type: 'product' }).lean()
  const saleMap = {}
  const consMap = {}
  for (const p of products) {
    saleMap[p.name] = Number(p.salePrice || 0)
    consMap[p.name] = Number(p.consumableCost || 0)
  }

  // 3) 原料成本：一次性聚合所有日期
  const outAgg = await OutRecord.aggregate([
    { $group: { _id: '$date', total: { $sum: '$price' } } }
  ])
  const outMap = {}
  for (const a of outAgg) outMap[a._id] = Number(a.total || 0)

  // 4) 計算每一天的營收/成本
  const enriched = list.map(r => {
    const itemsArr = Array.isArray(r.items) ? r.items : []
    const revenue = itemsArr.reduce(
      (s, it) => s + Number(it.qty || 0) * Number(saleMap[it.item] || 0),
      0
    )
    const extraConsumable = itemsArr.reduce(
      (s, it) => s + Number(it.qty || 0) * Number(consMap[it.item] || 0),
      0
    )
    const baseRawCost = Number(outMap[r.date] || 0)
    const cost = baseRawCost + extraConsumable
    return { ...r, revenueOfDay: to2(revenue), costOfDay: to2(cost) }
  })

  res.json(enriched)
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
    items: Array.isArray(b.items)
      ? b.items.map(r => ({ item: norm(r.item), qty: Number(r.qty || 0) }))
      : [],
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),

    // 🔹 優待費（兩個欄位都寫，確保相容）
    discountFee: Number(b.discountFee || b.preferentialFee || 0),
    preferentialFee: Number(b.discountFee || b.preferentialFee || 0),

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
