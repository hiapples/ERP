import express from 'express'
import Report from '../models/report.js'
import Item from '../models/item.js'

const router = express.Router()

// 全部報表
router.get('/', async (_req, res) => {
  const list = await Report.find({}).sort({ date: -1 })
  res.json(list)
})

// 單日報表
router.get('/:date', async (req, res) => {
  const { date } = req.params
  const doc = await Report.findOne({ date })
  res.json(doc)
})

// 新增/覆蓋（同日期 upsert）- 支援新(itemsQty)與舊(qtyCake/qtyJuice)
router.post('/', async (req, res) => {
  const { date, fixedExpense, extraExpense, netProfit } = req.body || {}
  if (!date) return res.status(400).json({ error: 'date is required' })

  let { itemsQty } = req.body

  // 舊格式轉換（若前端仍送 qtyCake/qtyJuice，幫忙轉為 itemsQty）
  if (!Array.isArray(itemsQty)) {
    const items = await Item.find({}).sort({ createdAt: 1 }).limit(2)
    itemsQty = []
    if (req.body.hasOwnProperty('qtyCake') && items[0]) {
      itemsQty.push({ name: items[0].name, qty: Number(req.body.qtyCake || 0) })
    }
    if (req.body.hasOwnProperty('qtyJuice') && items[1]) {
      itemsQty.push({ name: items[1].name, qty: Number(req.body.qtyJuice || 0) })
    }
  }

  const doc = await Report.findOneAndUpdate(
    { date },
    {
      $set: {
        itemsQty: Array.isArray(itemsQty) ? itemsQty.map(i => ({ name: i.name, qty: Number(i.qty || 0) })) : [],
        fixedExpense: Number(fixedExpense || 0),
        extraExpense: Number(extraExpense || 0),
        netProfit: Number(netProfit || 0)
      }
    },
    { new: true, upsert: true }
  )
  res.json(doc)
})

// 刪除單日報表
router.delete('/:date', async (req, res) => {
  const { date } = req.params
  await Report.deleteOne({ date })
  res.json({ ok: true })
})

export default router
