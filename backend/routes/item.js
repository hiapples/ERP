import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

// 取得所有品項
router.get('/', async (_req, res) => {
  const items = await Item.find({}).sort({ createdAt: 1 })
  res.json(items)
})

// 新增品項
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

// 更新品項
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

// 刪除品項（不連動刪既有 in/out 紀錄，只是移除可選清單）
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await Item.findByIdAndDelete(id)
  res.json({ ok: true })
})

export default router
