// backend/routes/item.js
import express from 'express'
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

router.get('/', async (_req, res) => {
  const items = await Item.find().lean()
  res.json(items) // 前端支援 array 或 {items:[...]}，這裡直接回 array
})

router.post('/', async (req, res) => {
  const { name, type, salePrice = 0, bindRaw = '' } = req.body || {}
  const doc = await Item.create({
    name: norm(name),
    type: type === 'product' ? 'product' : 'raw',
    salePrice: Number(salePrice || 0),
    bindRaw: type === 'product' ? norm(bindRaw || '') : ''
  })
  res.json(doc)
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice = 0, bindRaw } = req.body || {}
  const payload = {
    name: norm(name),
    salePrice: Number(salePrice || 0)
  }
  if (bindRaw !== undefined) payload.bindRaw = norm(bindRaw || '')
  const doc = await Item.findByIdAndUpdate(id, payload, { new: true })
  res.json(doc)
})

router.delete('/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
