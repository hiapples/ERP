import express from 'express'
import Item from '../models/item.js'

const router = express.Router()
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n || 0)))

router.get('/', async (_req, res) => {
  const items = await Item.find().lean()
  res.json(items)
})

/** 建立 item（支援 product 的 bindRaw2/bindRatio2/consumableCost） */
router.post('/', async (req, res) => {
  const { name, type, salePrice = 0, bindRaw = '', bindRaw2 = '', bindRatio2 = 0, consumableCost = 0 } = req.body
  if (!name || !type) return res.status(400).json({ error: '缺少 name/type' })

  const doc = await Item.create({
    name,
    type,
    salePrice: Number(salePrice || 0),
    bindRaw: String(bindRaw || ''),
    bindRaw2: type === 'product' ? String(bindRaw2 || '') : '',
    bindRatio2: type === 'product' ? clamp01(bindRatio2) : 0,
    consumableCost: type === 'product' ? Number(consumableCost || 0) : 0
  })
  res.json(doc)
})

/** 更新 item */
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice, bindRaw, bindRaw2, bindRatio2, consumableCost } = req.body

  const payload = {}
  if (name !== undefined) payload.name = String(name)
  if (salePrice !== undefined) payload.salePrice = Number(salePrice || 0)
  if (bindRaw !== undefined) payload.bindRaw = String(bindRaw || '')
  if (bindRaw2 !== undefined) payload.bindRaw2 = String(bindRaw2 || '')
  if (bindRatio2 !== undefined) payload.bindRatio2 = clamp01(bindRatio2)
  if (consumableCost !== undefined) payload.consumableCost = Number(consumableCost || 0)

  const doc = await Item.findByIdAndUpdate(id, payload, { new: true })
  if (!doc) return res.status(404).json({ error: 'not found' })
  res.json(doc)
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const ok = await Item.findByIdAndDelete(id)
  if (!ok) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

export default router
