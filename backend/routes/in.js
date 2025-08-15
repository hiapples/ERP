import express from 'express'
import InRecord from '../models/in.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const { date, item } = req.query
  const cond = {}
  if (date) cond.date = date
  if (item) cond.item = item
  const list = await InRecord.find(cond).sort({ createdAt: -1 })
  res.json(list)
})

router.post('/', async (req, res) => {
  const body = req.body
  const toSave = Array.isArray(body) ? body : [body]
  const docs = toSave.map(r => ({
    item: r.item,
    quantity: Number(r.quantity),
    price: Number(Number(r.price).toFixed(2)), // 整筆金額
    note: r.note || '',
    date: r.date
  }))
  const ret = await InRecord.insertMany(docs)
  res.json({ inserted: ret.length, ids: ret.map(d => d._id) })
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const r = req.body || {}
  const doc = await InRecord.findByIdAndUpdate(
    id,
    {
      $set: {
        item: r.item,
        quantity: Number(r.quantity),
        price: Number(Number(r.price).toFixed(2)),
        note: r.note || '',
        date: r.date
      }
    },
    { new: true }
  )
  res.json(doc)
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await InRecord.findByIdAndDelete(id)
  res.json({ ok: true })
})

export default router
