import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const to2 = (n) => Math.round(Number(n || 0) * 100) / 100

// 取得全部（新到舊）+ 計算：當天營收、當天銷貨成本(= 總成本 − 四費)
// 其中 總成本 = 當天營業收入 − 淨利
router.get('/', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 }).lean()

  // 成品售價對照，用來算每日營收
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

    // 四費
    const fees =
      Number(r.stallFee || 0) +
      Number(r.parkingFee || 0) +
      Number(r.insuranceFee || 0) +
      Number((r.discountFee ?? r.preferentialFee) || 0)

    // 總成本 = 營收 - 淨利
    const totalCost = Number(revenue) - Number(r.netProfit || 0)

    // 當天銷貨成本（新定義）
    const costOfDay = to2(totalCost - fees)

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

  const payload = {
    date,
    items: Array.isArray(b.items)
      ? b.items.map(r => ({ item: norm(r.item), qty: Number(r.qty || 0) }))
      : [],
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),

    // 優待費（雙命名相容）
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
