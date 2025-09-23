// backend/routes/reports.js  (ESM)
import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'
import OutRecord from '../models/out.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const to2  = (n) => Math.round(Number(n || 0) * 100) / 100

// 內部：計算當日合計
// revenueOfDay = Σ(成品 qty * salePrice)
// baseRawCost  = 當日所有 OutRecord.price 合計
// extraCost    = Σ(成品 qty * consumableCost)
// costOfDay    = baseRawCost + extraCost
// netProfit    = revenueOfDay - costOfDay - 六費用
async function computeDayTotals(date, itemsRows, fees) {
  // 取產品價 & 耗材
  const products = await Item.find({ type: 'product' }).lean()
  const saleMap  = {}
  const extraMap = {}
  for (const p of products) {
    saleMap[p.name]  = Number(p.salePrice || 0)
    extraMap[p.name] = Number(p.consumableCost || 0)
  }

  let revenue = 0
  let extraCost = 0
  for (const r of itemsRows) {
    const name = norm(r.item)
    const qty  = Number(r.qty || 0)
    revenue   += qty * (saleMap[name]  || 0)
    extraCost += qty * (extraMap[name] || 0)
  }

  const outs = await OutRecord.find({ date }).lean()
  let baseRawCost = 0
  for (const o of outs) baseRawCost += Number(o.price || 0)

  const costOfDay  = baseRawCost + extraCost
  const totalFees =
    Number(fees.stallFee || 0) +
    Number(fees.parkingFee || 0) +
    Number(fees.insuranceFee || 0) +
    Number(fees.treatFee || 0) +
    Number(fees.personnelFee || 0) +
    Number(fees.guildFee || 0)

  const netProfit = revenue - costOfDay - totalFees
  return {
    revenueOfDay: to2(revenue),
    costOfDay: to2(costOfDay),
    netProfit: to2(netProfit),
  }
}

/**
 * 取得全部（新到舊）
 * 若舊資料沒有 revenueOfDay/costOfDay，會以 (Σqty*售價) 與 (revenue - netProfit) 快速補齊回傳（不寫回 DB）
 */
router.get('/', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 }).lean()

  // 產品售價快取（僅用於缺欄位時的快速估算）
  const products = await Item.find({ type: 'product' }).lean()
  const saleMap = {}
  for (const p of products) saleMap[p.name] = Number(p.salePrice || 0)

  const enriched = list.map(r => {
    const itemsArr = Array.isArray(r.items) ? r.items : []
    let revenue = Number(r.revenueOfDay || 0)

    if (!revenue) {
      revenue = itemsArr.reduce(
        (s, it) => s + Number(it.qty || 0) * Number(saleMap[norm(it.item)] || 0),
        0
      )
    }

    const revenue2  = to2(revenue)
    const costOfDay = r.costOfDay != null ? to2(r.costOfDay) : to2(revenue2 - Number(r.netProfit || 0))

    return {
      ...r,
      revenueOfDay: revenue2,
      costOfDay,
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

// 新增/覆寫（以 date upsert）— 後端計算合計與淨利；相容舊欄位
router.post('/', async (req, res) => {
  const b = req.body || {}
  const date = norm(b.date)

  // 成品份數
  const itemsRows = Array.isArray(b.items)
    ? b.items.map(r => ({ item: norm(r.item), qty: Number(r.qty || 0) }))
    : []

  // 六費用（新）+ 舊欄位相容（discountFee / preferentialFee → treatFee）
  const treatFeeFromOld = (b.treatFee != null ? b.treatFee : (b.discountFee != null ? b.discountFee : b.preferentialFee))
  const fees = {
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),
    treatFee: Number(treatFeeFromOld || 0),   // 請客費（優待費更名）
    personnelFee: Number(b.personnelFee || 0),
    guildFee: Number(b.guildFee || 0),
  }

  // 後端計算合計
  const totals = await computeDayTotals(date, itemsRows, fees)

  // 準備寫入（同時保留舊欄位，方便舊前端或舊匯出）
  const payload = {
    date,
    items: itemsRows,

    // 新欄位
    stallFee: fees.stallFee,
    parkingFee: fees.parkingFee,
    insuranceFee: fees.insuranceFee,
    treatFee: fees.treatFee,
    personnelFee: fees.personnelFee,
    guildFee: fees.guildFee,

    // 舊欄位鏡像（相容）
    discountFee: fees.treatFee,
    preferentialFee: fees.treatFee,
    fixedExpense: fees.stallFee,
    extraExpense: fees.insuranceFee,

    // 合計
    revenueOfDay: totals.revenueOfDay,
    costOfDay: totals.costOfDay,
    netProfit: totals.netProfit,
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
