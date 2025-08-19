import { Router } from 'express'
import Item from '../models/item.js'

const router = Router()
const norm = (v) => (v == null ? '' : String(v).trim())

// 取得全部品項
router.get('/', async (_req, res) => {
  const items = await Item.find().sort({ type: 1, name: 1 }).lean()
  res.json(items)
})

// 新增品項（raw 或 product）
router.post('/', async (req, res) => {
  const body = req.body || {}
  const doc = await Item.create({
    name: norm(body.name),
    salePrice: Number(body.salePrice || 0),
    type: body.type === 'raw' ? 'raw' : 'product',
    consumableCost: Number(body.consumableCost || 0)
  })
  res.json(doc)
})

// 更新品項
router.put('/:id', async (req, res) => {
  const body = req.body || {}
  const doc = await Item.findByIdAndUpdate(
    req.params.id,
    {
      name: norm(body.name),
      salePrice: Number(body.salePrice || 0),
      consumableCost: Number(body.consumableCost || 0)
    },
    { new: true }
  )
  res.json(doc)
})

// 刪除品項
router.delete('/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
