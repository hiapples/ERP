import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const to2 = (n) => Math.round(Number(n || 0) * 100) / 100

// 取得全部（排序新到舊）+ 當天營收 / 當天銷貨成本(=總成本-四費)
router.get('/', async (_req, res) => {
  // 1) 報表列表
  const list = await Report.find().sort({ date: -1 }).lean()

  // 2) 成品價目對照（算營收用）
  const products = await Item.find({ type: 'product' }).lean()
  const saleMap = {}
  for (const p of products) saleMap[p.name] = Number(p.salePrice || 0)

  // 3) 逐日計算
  const enriched = list.map(r => {
    const itemsArr = Array.isArray(r.items) ? r.items : []

    // 營業收入
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

    // 總成本 = 營收 - 淨利（由前端存進來）
    const totalCost = Number(revenue) - Number(r.netProfit || 0)

    // 銷貨成本（新定義）
    const costOfDay = to2(totalCost - fees)

    return {
      ...r,
      revenueOfDay: Math.round(revenue), // 與前端顯示一致
      costOfDay
    }
  })

  res.json(enriched)
})

// 其餘 GET /:date、POST /、DELETE /:date 保持原樣
export default router
