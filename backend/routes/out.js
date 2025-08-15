// backend/routes/out.js
import { Router } from 'express'
import OutRecord from '../models/out.js'
import InRecord from '../models/in.js'

const router = Router()

// 取得出庫
router.get('/', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await OutRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 依日期回傳兩組銷貨成本（整筆金額加總）
router.get('/total/:date', async (req, res) => {
  const date = req.params.date
  const list = await OutRecord.find({ date })

  const totalGroup1 = list
    .filter(r => r.item === '檸檬汁')
    .reduce((s, r) => s + Number(r.price || 0), 0)

  const totalGroup2 = list
    .filter(r => r.item === '蘋果汁')
    .reduce((s, r) => s + Number(r.price || 0), 0)

  res.json({ totalGroup1, totalGroup2 })
})

// 新增出庫（若未帶 price，後端用「目前平均單價 × 數量」自動計算整筆金額）
router.post('/', async (req, res) => {
  try {
    const payload = req.body
    const rows = Array.isArray(payload) ? payload : [payload]

    const built = []
    for (const n of rows) {
      let linePrice = Number(n.price || 0)
      if (!linePrice) {
        // 計算目前平均單價 = (入庫整筆金額總和 - 出庫整筆金額總和) / (入庫數量總和 - 出庫數量總和)
        const item = n.item
        const inList = await InRecord.find({ item })
        const outList = await OutRecord.find({ item })

        const inQty = inList.reduce((s, r) => s + Number(r.quantity), 0)
        const inSum = inList.reduce((s, r) => s + Number(r.price), 0)
        const outQty = outList.reduce((s, r) => s + Number(r.quantity), 0)
        const outSum = outList.reduce((s, r) => s + Number(r.price), 0)

        const stockQty = inQty - outQty
        const stockSum = inSum - outSum
        const avg = stockQty > 0 ? stockSum / stockQty : 0
        linePrice = Number((avg * Number(n.quantity)).toFixed(2))
      }

      built.push({
        item: n.item,
        quantity: Number(n.quantity),
        price: linePrice,
        note: n.note || '',
        date: n.date
      })
    }

    if (Array.isArray(payload)) {
      const docs = await OutRecord.insertMany(built)
      return res.json({ ok: true, inserted: docs.length })
    } else {
      const doc = await OutRecord.create(built[0])
      return res.json({ ok: true, inserted: 1, id: doc._id })
    }
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message })
  }
})

// 更新出庫
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { item, quantity, price, note, date } = req.body
  await OutRecord.findByIdAndUpdate(id, {
    item, quantity: Number(quantity), price: Number(price), note, date
  })
  res.json({ ok: true })
})

// 刪除出庫
router.delete('/:id', async (req, res) => {
  await OutRecord.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
