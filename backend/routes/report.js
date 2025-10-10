import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = Router()

// 工具：依 items[] 計算營收與成本
async function computeTotals(itemsRows) {
  // 取出所有需要的成品價目表
  const names = []
  for (const r of itemsRows || []) {
    if (r && r.item) names.push(String(r.item))
  }
  const unique = Array.from(new Set(names))
  const map = {}
  if (unique.length > 0) {
    const docs = await Item.find({ name: { $in: unique } }).lean()
    for (const d of docs) {
      map[d.name] = { salePrice: Number(d.salePrice || 0), consumableCost: Number(d.consumableCost || 0) }
    }
  }

  let revenue = 0
  let cost = 0
  for (const r of itemsRows || []) {
    const n = String(r.item || '')
    const qty = Number(r.qty || 0)
    const price = map[n] ? Number(map[n].salePrice || 0) : 0
    const cons = map[n] ? Number(map[n].consumableCost || 0) : 0
    revenue += qty * price
    cost += qty * cons
  }
  return { revenueOfDay: revenue, costOfDay: cost }
}

// 取得全部報表（依日期新到舊）
router.get('/', async (req, res, next) => {
  try {
    const list = await Report.find({}).sort({ date: -1 }).lean()
    res.json({ items: list })
  } catch (e) { next(e) }
})

// 取得單日報表
router.get('/:date', async (req, res, next) => {
  try {
    const d = String(req.params.date)
    const r = await Report.findOne({ date: d }).lean()
    if (!r) return res.status(204).end()
    res.json(r)
  } catch (e) { next(e) }
})

// 新增/覆寫單日報表（若該日已存在則更新）
router.post('/', async (req, res, next) => {
  try {
    const payload = {
      date: String(req.body.date || ''),
      items: Array.isArray(req.body.items) ? req.body.items.map(function (x) {
        return { item: String(x.item || '').trim(), qty: Number(x.qty || 0) }
      }) : [],
      stallFee: Number(req.body.stallFee || 0),
      parkingFee: Number(req.body.parkingFee || 0),
      treatFee: Number(req.body.treatFee || 0),
      personnelFee: Number(req.body.personnelFee || 0)
    }
    if (!payload.date) return res.status(400).json({ error: 'date is required' })

    const totals = await computeTotals(payload.items)
    const revenueOfDay = totals.revenueOfDay
    const costOfDay = totals.costOfDay
    const netProfit = revenueOfDay - costOfDay - payload.stallFee - payload.parkingFee - payload.treatFee - payload.personnelFee

    const doc = await Report.findOneAndUpdate(
      { date: payload.date },
      {
        date: payload.date,
        items: payload.items,
        stallFee: payload.stallFee,
        parkingFee: payload.parkingFee,
        treatFee: payload.treatFee,
        personnelFee: payload.personnelFee,
        revenueOfDay: revenueOfDay,
        costOfDay: costOfDay,
        netProfit: netProfit
      },
      { upsert: true, new: true }
    )

    res.json(doc)
  } catch (e) { next(e) }
})

// 刪除單日報表
router.delete('/:date', async (req, res, next) => {
  try {
    const d = String(req.params.date)
    await Report.findOneAndDelete({ date: d })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
