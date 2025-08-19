import express from 'express'
import InRecord from '../models/in.js'
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

router.get('/', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = String(date)
  if (item) q.item = norm(item)
  res.json(await InRecord.find(q).sort({ createdAt: -1 }))
})

router.post('/', async (req, res) => {
  const { item, quantity, price, note = '', date } = req.body || {}
  const name = norm(item)
  const found = await Item.findOne({ name })
  if (!found) return res.status(400).json({ error: '品項不存在' })
  if (found.type !== 'raw') return res.status(400).json({ error: '只能入庫原料' })
  res.json(await InRecord.create({
    item: name,
    quantity: Number(quantity),
    price: Number(price),
    note: String(note || ''),
    date: String(date)
  }))
})

router.put('/:id', async (req, res) => {
  const b = req.body || {}
  if (b.item) {
    const found = await Item.findOne({ name: norm(b.item) })
    if (!found) return res.status(400).json({ error: '品項不存在' })
    if (found.type !== 'raw') return res.status(400).json({ error: '入庫僅能是原料' })
  }
  res.json(await InRecord.findByIdAndUpdate(
    req.params.id,
    {
      ...(b.item !== undefined ? { item: norm(b.item) } : {}),
      ...(b.quantity !== undefined ? { quantity: Number(b.quantity) } : {}),
      ...(b.price !== undefined ? { price: Number(b.price) } : {}),
      ...(b.note !== undefined ? { note: String(b.note || '') } : {}),
      ...(b.date !== undefined ? { date: String(b.date || '') } : {})
    },
    { new: true }
  ))
})

router.delete('/:id', async (req, res) => {
  const r = await InRecord.findByIdAndDelete(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

export default router
