import { Router } from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = Router()

async function computeTotals(itemsRows) {
  const names = Array.from(new Set((itemsRows || []).map(r => String(r.item || ''))))
  const priceMap = {}
  const consMap  = {}
  if (names.length) {
    const docs = await Item.find({ name: { $in: names } }).lean()
    for (const d of docs) {
      priceMap[d.name] = Number(d.salePrice || 0)
      consMap[d.name]  = Number(d.consumableCost || 0)
    }
  }
  let revenue = 0, cost = 0
  for (const r of (itemsRows || [])) {
    const qty = Number(r.qty || 0)
    revenue += qty * (priceMap[r.item] || 0)
    cost    += qty * (consMap[r.item]  || 0)
  }
  return { revenueOfDay: revenue, costOfDay: cost }
}

router.get('/', async (req, res, next) => {
  try {
    const list = await Report.find({}).sort({ date: -1 }).lean()
    res.json({ items: list })
  } catch (e) { next(e) }
})

router.get('/:date', async (req, res, next) => {
  try {
    const d = String(req.params.date)
    const r = await Report.findOne({ date: d }).lean()
    if (!r) return res.status(204).end()
    res.json(r)
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = {
      date: String(req.body.date || ''),
      items: Array.isArray(req.body.items) ? req.body.items.map(x => ({
        item: String(x.item || '').trim(),
        qty: Number(x.qty || 0)
      })) : [],
      stallFee: Number(req.body.stallFee || 0),
      parkingFee: Number(req.body.parkingFee || 0),
      treatFee: Number(req.body.treatFee || 0),
      personnelFee: Number(req.body.personnelFee || 0)
    }
    if (!payload.date) return res.status(400).json({ error: 'date is required' })

    const { revenueOfDay, costOfDay } = await computeTotals(payload.items)
    const netProfit = revenueOfDay - costOfDay - payload.stallFee - payload.parkingFee - payload.treatFee - payload.personnelFee

    const doc = await Report.findOneAndUpdate(
      { date: payload.date },
      { ...payload, revenueOfDay, costOfDay, netProfit },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (e) { next(e) }
})

router.delete('/:date', async (req, res, next) => {
  try {
    await Report.findOneAndDelete({ date: String(req.params.date) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
