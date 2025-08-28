import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const to2 = (n) => Math.round(Number(n || 0) * 100) / 100

// 取得全部（新到舊）+ 計算：當天營業收入、總成本（= 營收 - 淨利 = 總銷貨成本 + 四費）
router.get('/', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 }).lean()

  // 成品售價對照（算每日營收用）
  const products = await Item.find({ type: 'product' }).lean()
  const saleMap = {}
  for (const p of products) saleMap[p.name] = Number(p.salePrice || 0)

  const enriched = list.map(r => {
    const itemsArr = Array.isArray(r.items) ? r.items : []

    // 當天營業收入
    const revenue = itemsArr.reduce(
      (s, it) => s + Number(it.qty || 0) * Number(saleMap[it.item] || 0),
      0
    )

    // 總成本（= 營收 - 淨利；含四費）
    const totalCost = Number(revenue) - Number(r.netProfit || 0)
    const costOfDay = to2(totalCost)

    return {
      ...r,
      revenueOfDay: Math.round(revenue),
      costOfDay
    }
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
  const discount = Number(b.discountFee || b.preferentialFee || 0)

  const payload = {
    date,
    items: Array.isArray(b.items)
      ? b.items.map(r => ({ item: norm(r.item), qty: Number(r.qty || 0) }))
      : [],
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),
    // 優待費（雙命名相容）
    discountFee: discount,
    preferentialFee: discount,
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
