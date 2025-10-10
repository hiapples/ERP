import { Router } from 'express'
import OutRecord from '../models/out.js'
const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const q = {}
    if (req.query.date) q.date = String(req.query.date)
    if (req.query.item) q.item = String(req.query.item)
    const list = await OutRecord.find(q).sort({ createdAt: -1 }).lean()
    res.json({ items: list })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = {
      item: String(req.body.item || '').trim(),
      quantity: Number(req.body.quantity || 0),
      note: String(req.body.note || ''),
      date: String(req.body.date || '')
    }
    if (!payload.item) return res.status(400).json({ error: 'item is required' })
    if (!payload.date) return res.status(400).json({ error: 'date is required' })
    const doc = await OutRecord.create(payload)
    res.json(doc)
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const update = {
      item: req.body.item == null ? undefined : String(req.body.item).trim(),
      quantity: req.body.quantity == null ? undefined : Number(req.body.quantity),
      note: req.body.note == null ? undefined : String(req.body.note),
      date: req.body.date == null ? undefined : String(req.body.date)
    }
    const doc = await OutRecord.findByIdAndUpdate(req.params.id, update, { new: true })
    res.json(doc)
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await OutRecord.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
