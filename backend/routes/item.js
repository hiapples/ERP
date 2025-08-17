// backend/routes/items.js
import express from 'express'
import Item from '../models/item.js'

const router = express.Router()

// 全部
router.get('/', async (_req, res) => {
  const items = await Item.find().sort({ type: 1, name: 1 })
  res.json(items)
})

// 新增
router.post('/', async (req, res) => {
  try {
    let { name, salePrice = 0, type = 'raw' } = req.body
    if (!name || !String(name).trim()) return res.status(400).json({ error: '缺少名稱' })
    name = String(name).trim()
    if (!['raw', 'product'].includes(type)) type = 'raw'
    salePrice = Number(salePrice || 0)

    const exists = await Item.findOne({ name })
    if (exists) return res.status(409).json({ error: '名稱已存在' })

    const it = await Item.create({ name, salePrice, type })
    res.json(it)
  } catch (e) {
    res.status(500).json({ error: e.message || '新增失敗' })
  }
})

// 更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, salePrice } = req.body
    const update = {}
    if (typeof name === 'string') update.name = name.trim()
    if (salePrice !== undefined) update.salePrice = Number(salePrice || 0)

    // 不允許改 type（避免亂掉）
    const it = await Item.findByIdAndUpdate(id, update, { new: true })
    if (!it) return res.status(404).json({ error: '找不到品項' })
    res.json(it)
  } catch (e) {
    res.status(500).json({ error: e.message || '更新失敗' })
  }
})

// 刪除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await Item.findByIdAndDelete(id)
    if (!result) return res.status(404).json({ error: '找不到品項' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message || '刪除失敗' })
  }
})

export default router
