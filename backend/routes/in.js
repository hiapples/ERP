// backend/routes/in.js
import { Router } from 'express'
import InRecord from '../models/in.js'

const router = Router()

// 取得入庫
router.get('/', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await InRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 新增入庫（支援單筆或陣列）
router.post('/', async (req, res) => {
  try {
    const payload = req.body
    if (Array.isArray(payload)) {
      const docs = await InRecord.insertMany(payload.map(n => ({
        item: n.item,
        quantity: Number(n.quantity),
        price: Number(n.price),
        note: n.note || '',
        date: n.date
      })))
      res.json({ ok: true, inserted: docs.length })
    } else {
      const doc = await InRecord.create({
        item: payload.item,
        quantity: Number(payload.quantity),
        price: Number(payload.price),
        note: payload.note || '',
        date: payload.date
      })
      res.json({ ok: true, inserted: 1, id: doc._id })
    }
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message })
  }
})

// 更新入庫
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { item, quantity, price, note, date } = req.body
  await InRecord.findByIdAndUpdate(id, {
    item, quantity: Number(quantity), price: Number(price), note, date
  })
  res.json({ ok: true })
})

// 刪除入庫
router.delete('/:id', async (req, res) => {
  await InRecord.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
