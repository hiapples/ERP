import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

router.get('/', async (_req, res) => {
  const items = await Item.find({}).sort({ createdAt: 1 })
  res.json(items)
})

router.post('/', async (req, res) => {
  const { name, salePrice } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const doc = await Item.create({ name: name.trim(), salePrice: Number(salePrice || 0) })
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: e?.message || 'create failed' })
  }
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice } = req.body || {}
  try {
    const doc = await Item.findByIdAndUpdate(
      id,
      { $set: { name: name?.trim(), salePrice: Number(salePrice || 0) } },
      { new: true }
    )
    res.json(doc)
  } catch (e) {
    res.status(400).json({ error: e?.message || 'update failed' })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await Item.findByIdAndDelete(id)
  res.json({ ok: true })
})

export default router
