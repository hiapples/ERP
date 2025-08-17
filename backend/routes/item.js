// backend/routes/item.js
import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

// 例：CRUD
router.get('/', async (req, res) => {
  const items = await Item.find().lean()
  res.json(items)
})
router.post('/', async (req, res) => {
  const { name, type, salePrice = 0, bindRaw = '' } = req.body
  const doc = await Item.create({ name, type, salePrice, bindRaw })
  res.json(doc)
})
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice = 0, bindRaw = '' } = req.body
  const doc = await Item.findByIdAndUpdate(id, { name, salePrice, bindRaw }, { new: true })
  res.json(doc)
})
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await Item.findByIdAndDelete(id)
  res.json({ ok: true })
})

// ✅ 重點：預設匯出
export default router
