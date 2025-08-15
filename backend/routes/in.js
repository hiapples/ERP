// backend/routes/in.js
import express from 'express'
import Record from '../models/in.js'

const router = express.Router()

// 兩位小數輔助
const n2 = (v) => Number(Number(v || 0).toFixed(2))
const q2 = (v) => Number(Number(v || 0).toFixed(2)) // 數量也保留兩位

// GET /records
// 可用 ?date=YYYY-MM-DD &item=檸檬汁 查詢
router.get('/', async (req, res) => {
  try {
    const { date, item } = req.query
    const filter = {}
    if (date) filter.date = String(date)
    if (item) filter.item = String(item)
    const list = await Record.find(filter).sort({ date: -1, createdAt: -1 })
    res.json(list)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /records/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Record.findById(req.params.id)
    if (!doc) return res.status(404).json({ message: '找不到資料' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST /records
// 前端現在送「單筆物件」；也相容舊版陣列一次多筆
// 規則：price 為「整筆金額」，不再用單價×數量
router.post('/', async (req, res) => {
  try {
    const body = req.body
    const toArray = Array.isArray(body) ? body : [body]

    // 基本驗證
    for (const r of toArray) {
      if (!r || !r.item) {
        return res.status(400).json({ message: 'item 必填' })
      }
      if (r.quantity === undefined || Number(r.quantity) <= 0) {
        return res.status(400).json({ message: 'quantity 需為 > 0 的數字' })
      }
      if (r.price === undefined || Number(r.price) < 0) {
        return res.status(400).json({ message: 'price 需為 >= 0 的數字（整筆金額）' })
      }
      if (!r.date) {
        return res.status(400).json({ message: 'date 必填 (YYYY-MM-DD)' })
      }
    }

    // 正規化資料（price、quantity 兩位小數；price 視為整筆金額）
    const docs = toArray.map(r => ({
      item: String(r.item),
      quantity: q2(r.quantity),
      price: n2(r.price),      // ⬅️ 整筆金額直接存
      note: r.note ? String(r.note) : '',
      date: String(r.date),
    }))

    if (Array.isArray(body)) {
      const inserted = await Record.insertMany(docs)
      return res.json({ inserted: inserted.length, ids: inserted.map(d => d._id) })
    } else {
      const created = await Record.create(docs[0])
      return res.json(created)
    }
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// PUT /records/:id
// 可更新 item/quantity/price/note/date
// price 仍為整筆金額；quantity 可小數
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const payload = {}
    if (req.body.item !== undefined) payload.item = String(req.body.item)
    if (req.body.quantity !== undefined) {
      const q = Number(req.body.quantity)
      if (!(q > 0)) return res.status(400).json({ message: 'quantity 需為 > 0 的數字' })
      payload.quantity = q2(q)
    }
    if (req.body.price !== undefined) {
      const p = Number(req.body.price)
      if (p < 0 || Number.isNaN(p)) return res.status(400).json({ message: 'price 需為 >= 0 的數字（整筆金額）' })
      payload.price = n2(p)
    }
    if (req.body.note !== undefined) payload.note = String(req.body.note || '')
    if (req.body.date !== undefined) payload.date = String(req.body.date)

    const updated = await Record.findByIdAndUpdate(id, { $set: payload }, { new: true })
    if (!updated) return res.status(404).json({ message: '找不到資料' })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// DELETE /records/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Record.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: '找不到資料' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

export default router
