import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

// 取得全部品項
router.get('/', async (_req, res) => {
  const items = await Item.find().sort({ createdAt: 1 })
  res.json(items)
})

// 新增品項
router.post('/', async (req, res) => {
  try {
    const { name, salePrice = 0, type = 'raw' } = req.body
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' })
    const it = await Item.create({ name: String(name).trim(), salePrice: Number(salePrice) || 0, type })
    res.json(it)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新（名稱 / 售價；不動 type）
router.put('/:id', async (req, res) => {
  try {
    const { name, salePrice } = req.body
    const doc = await Item.findByIdAndUpdate(
      req.params.id,
      { ...(name !== undefined ? { name } : {}), ...(salePrice !== undefined ? { salePrice } : {}) },
      { new: true }
    )
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 刪除
router.delete('/:id', async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
