// backend/routes/items.js
import { Router } from 'express'
import Item from '../models/item.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())
const toNum = (v) => Number(v || 0)
const nonneg = (n) => (Number.isFinite(n) && n >= 0)

// 取得全部品項：依新增順序（由舊到新）
router.get('/', async (_req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: 1, _id: 1 })
      .lean()
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: 'failed_to_list_items', message: err.message })
  }
})

// 新增品項（raw 或 product）
router.post('/', async (req, res) => {
  try {
    const body = req.body || {}
    const name = norm(body.name)
    const type = body.type === 'raw' ? 'raw' : 'product'
    const salePrice = toNum(body.salePrice)
    const consumableCost = toNum(body.consumableCost)

    if (!name) return res.status(400).json({ error: 'invalid_name', message: 'name is required' })
    if (!nonneg(salePrice)) return res.status(400).json({ error: 'invalid_salePrice', message: 'salePrice must be >= 0' })
    if (!nonneg(consumableCost)) return res.status(400).json({ error: 'invalid_consumableCost', message: 'consumableCost must be >= 0' })

    const doc = await Item.create({ name, type, salePrice, consumableCost })
    res.json(doc)
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'duplicate_item', message: '同類型下的品項名稱不可重複' })
    }
    res.status(500).json({ error: 'failed_to_create_item', message: err.message })
  }
})

// 更新品項
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {}
    const name = norm(body.name)
    const salePrice = toNum(body.salePrice)
    const consumableCost = toNum(body.consumableCost)

    if (!name) return res.status(400).json({ error: 'invalid_name', message: 'name is required' })
    if (!nonneg(salePrice)) return res.status(400).json({ error: 'invalid_salePrice', message: 'salePrice must be >= 0' })
    if (!nonneg(consumableCost)) return res.status(400).json({ error: 'invalid_consumableCost', message: 'consumableCost must be >= 0' })

    const doc = await Item.findByIdAndUpdate(
      req.params.id,
      { name, salePrice, consumableCost },
      { new: true, runValidators: true }
    )
    if (!doc) return res.status(404).json({ error: 'not_found' })
    res.json(doc)
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'duplicate_item', message: '同類型下的品項名稱不可重複' })
    }
    res.status(500).json({ error: 'failed_to_update_item', message: err.message })
  }
})

// 刪除品項
router.delete('/:id', async (req, res) => {
  try {
    const r = await Item.findByIdAndDelete(req.params.id)
    if (!r) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'failed_to_delete_item', message: err.message })
  }
})

export default router
