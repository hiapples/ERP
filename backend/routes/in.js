import { Router } from 'express'
import InRecord from '../models/in.js'

const router = Router()
const _arr = (v) => (Array.isArray(v) ? v : (Array.isArray(v?.items) ? v.items : []))
const norm = (v) => (v == null ? '' : String(v).trim())

// 查詢入庫
router.get('/', async (req, res) => {
  const q = {}
  if (req.query.date) q.date = norm(req.query.date)
  if (req.query.item) q.item = norm(req.query.item)
  const list = await InRecord.find(q).sort({ createdAt: -1 }).lean()
  res.json(_arr(list))
})

// 新增入庫
router.post('/', async (req, res) => {
  const b = req.body || {}
  const doc = await InRecord.create({
    item: norm(b.item),
    quantity: Number(b.quantity || 0),
    price: Number(b.price || 0),
    note: norm(b.note || ''),
    date: norm(b.date)
  })
  res.json(doc)
})

// 更新
router.put('/:id', async (req, res) => {
  const b = req.body || {}
  const doc = await InRecord.findByIdAndUpdate(
    req.params.id,
    {
      item: norm(b.item),
      quantity: Number(b.quantity || 0),
      price: Number(b.price || 0),
      note: norm(b.note || ''),
      date: norm(b.date)
    },
    { new: true }
  )
  res.json(doc)
})

// 刪除
router.delete('/:id', async (req, res) => {
  await InRecord.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
