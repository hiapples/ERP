// backend/routes/item.js
import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

router.get('/', async (_req, res) => {
  const items = await Item.find().lean()
  res.json(items)
})

// ★ 新增：接受 consumableCost（僅 product 會用，raw 依然 0）
router.post('/', async (req, res) => {
  const { name, type, salePrice = 0, bindRaw = '', consumableCost = 0 } = req.body
  const doc = await Item.create({
    name,
    type,
    salePrice,
    bindRaw,
    consumableCost: type === 'product' ? Number(consumableCost || 0) : 0
  })
  res.json(doc)
})

// ★ 新增：更新時可改 consumableCost
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice = 0, bindRaw = '', consumableCost } = req.body

  const payload = { name, salePrice }
  if (bindRaw !== undefined) payload.bindRaw = bindRaw
  if (consumableCost !== undefined) payload.consumableCost = Number(consumableCost || 0)

  const doc = await Item.findByIdAndUpdate(id, payload, { new: true })
  res.json(doc)
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await Item.findByIdAndDelete(id)
  res.json({ ok: true })
})

export default router
