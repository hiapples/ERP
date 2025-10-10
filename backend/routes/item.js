import { Router } from 'express'
import Item from '../models/item.js'
const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const items = await Item.find({}).sort({ createdAt: 1 }).lean()
    res.json({ items })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const body = {
      name: String(req.body.name || '').trim(),
      salePrice: Number(req.body.salePrice || 0),
      type: 'product'
    }
    if (!body.name) return res.status(400).json({ error: 'name is required' })
    const doc = await Item.create(body)
    res.json(doc)
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const update = {
      name: req.body.name == null ? undefined : String(req.body.name).trim(),
      salePrice: req.body.salePrice == null ? undefined : Number(req.body.salePrice)
    }
    const doc = await Item.findByIdAndUpdate(req.params.id, update, { new: true })
    res.json(doc)
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await Item.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
