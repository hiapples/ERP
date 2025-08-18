import express from 'express'
import Item from '../models/item.js'
const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

router.get('/', async (_req, res) => {
  res.json(await Item.find().lean())
})

router.post('/', async (req, res) => {
  const { name, type, salePrice = 0, bindRaw = '' } = req.body || {}
  res.json(await Item.create({
    name: norm(name),
    type: type === 'product' ? 'product' : 'raw',
    salePrice: Number(salePrice || 0),
    bindRaw: type === 'product' ? norm(bindRaw || '') : ''
  }))
})

router.put('/:id', async (req, res) => {
  const { name, salePrice = 0, bindRaw } = req.body || {}
  const payload = { name: norm(name), salePrice: Number(salePrice || 0) }
  if (bindRaw !== undefined) payload.bindRaw = norm(bindRaw || '')
  res.json(await Item.findByIdAndUpdate(req.params.id, payload, { new: true }))
})

router.delete('/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
