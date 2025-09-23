import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'
import OutRecord from '../models/out.js' // 你的出庫 model（依專案實際路徑）

const router = Router()

const norm = (v) => (v == null ? '' : String(v).trim())
const toNum = (v) => Number(v || 0)
const to2 = (n) => Math.round(Number(n || 0) * 100) / 100

/**
 * 依日期即時計算每日合計：
 * revenueOfDay = Σ(成品 qty * salePrice)
 * baseRawCost  = 該日 OutRecord.price 合計
 * extraCost    = Σ(成品 qty * consumableCost)
 * costOfDay    = baseRawCost + extraCost
 * netProfit    = revenueOfDay - costOfDay - (stallFee + parkingFee + treatFee + personnelFee)
 */
async function computeDayTotals(date, itemsRows, fees) {
  // 讀取成品售價與耗材成本
  const products = await Item.find({ type: 'product' }).lean()
  const priceMap = {}
  const extraMap = {}
  for (const p of products) {
    priceMap[p.name] = toNum(p.salePrice)
    extraMap[p.name] = toNum(p.consumableCost)
  }

  // 營收 & 成品耗材
  let revenue = 0
  let extraCost = 0
  for (const r of itemsRows) {
    const name = norm(r.item)
    const qty = toNum(r.qty)
    revenue += qty * (priceMap[name] || 0)
    extraCost += qty * (extraMap[name] || 0)
  }

  // 當日原料出庫總成本
  const outs = await OutRecord.find({ date }).lean()
  const baseRawCost = outs.reduce((s, o) => s + toNum(o.price), 0)

  const costOfDay = baseRawCost + extraCost
  const totalFees = toNum(fees.stallFee) + toNum(fees.parkingFee) + toNum(fees.treatFee) + toNum(fees.personnelFee)
  const netProfit = revenue - costOfDay - totalFees

  return {
    revenueOfDay: Math.round(revenue),
    costOfDay: to2(costOfDay),
    netProfit: to2(netProfit)
  }
}

/** 取得全部（新到舊），回傳含即時計算欄位 */
router.get('/', async (_req, res) => {
  try {
    const list = await Report.find().sort({ date: -1 }).lean()

    // 逐筆計算（避免用舊欄位）
    const enriched = []
    for (const r of list) {
      const itemsRows = Array.isArray(r.items) ? r.items.map(it => ({ item: norm(it.item), qty: toNum(it.qty) })) : []
      const fees = {
        stallFee: toNum(r.stallFee),
        parkingFee: toNum(r.parkingFee),
        // treatFee 取新版；若舊資料只寫在 discount/preferential 也相容
        treatFee: toNum(r.treatFee != null ? r.treatFee : (r.discountFee != null ? r.discountFee : r.preferentialFee)),
        personnelFee: toNum(r.personnelFee)
      }
      const totals = await computeDayTotals(r.date, itemsRows, fees)
      enriched.push({
        ...r,
        revenueOfDay: totals.revenueOfDay,
        costOfDay: totals.costOfDay,
        netProfit: totals.netProfit
      })
    }

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: 'failed_to_list_reports', message: err.message })
  }
})

/** 取得某日原始報表資料（表單回填使用） */
router.get('/:date', async (req, res) => {
  try {
    const date = norm(req.params.date)
    const doc = await Report.findOne({ date }).lean()
    res.json(doc || null)
  } catch (err) {
    res.status(500).json({ error: 'failed_to_get_report', message: err.message })
  }
})

/** 新增/覆寫某日報表（idempotent: 以 date upsert） */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const date = norm(b.date)

    const itemsRows = Array.isArray(b.items)
      ? b.items.map(r => ({ item: norm(r.item), qty: toNum(r.qty) }))
      : []

    // 四費用（新版）；treatFee 相容舊欄位
    const fees = {
      stallFee: toNum(b.stallFee),
      parkingFee: toNum(b.parkingFee),
      treatFee: toNum(b.treatFee != null ? b.treatFee : (b.discountFee != null ? b.discountFee : b.preferentialFee)),
      personnelFee: toNum(b.personnelFee)
    }

    // 計算 totals（即時）
    const totals = await computeDayTotals(date, itemsRows, fees)

    // upsert（淨利也存一份，方便匯出；但讀取時仍以即時計算為主）
    await Report.updateOne(
      { date },
      {
        $set: {
          date,
          items: itemsRows,

          stallFee: fees.stallFee,
          parkingFee: fees.parkingFee,
          treatFee: fees.treatFee,
          personnelFee: fees.personnelFee,

          // 舊欄位鏡射（相容）
          discountFee: fees.treatFee,
          preferentialFee: fees.treatFee,

          netProfit: totals.netProfit
        }
      },
      { upsert: true }
    )

    const saved = await Report.findOne({ date }).lean()

    // 回傳時附上當次計算結果
    res.json({
      ...saved,
      revenueOfDay: totals.revenueOfDay,
      costOfDay: totals.costOfDay,
      netProfit: totals.netProfit
    })
  } catch (err) {
    res.status(500).json({ error: 'failed_to_save_report', message: err.message })
  }
})

/** 刪除某日 */
router.delete('/:date', async (req, res) => {
  try {
    const date = norm(req.params.date)
    await Report.deleteOne({ date })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'failed_to_delete_report', message: err.message })
  }
})

export default router
