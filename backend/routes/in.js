// backend/routes/in.js
import express from 'express'
import InRecord from '../models/in.js'
import Item from '../models/item.js'

const router = express.Router()

// 查詢
router.get('/', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await InRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 新增（限制只能入庫原料）
router.post('/', async (req, res) => {
  try {
    const { item, quantity, price, note = '', date } = req.body
    if (!item || !date) return res.status(400).json({ error: '缺少 item 或 date' })

    const found = await Item.findOne({ name: item })
    if (!found) return res.status(400).json({ error: '品項不存在' })
    if (found.type !== 'raw') return res.status(400).json({ error: '只能入庫「原料」' })

    const payload = {
      item,
      quantity: Number(quantity || 0),
      price: Number(price || 0),
      note,
      date
    }
    if (payload.quantity <= 0 || payload.price < 0) {
      return res.status(400).json({ error: '數量/價格不合法' })
    }
    const created = await InRecord.create(payload)
    res.json(created)
  } catch (e) {
    res.status(500).json({ error: e.message || '新增入庫失敗' })
  }
})

// 更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { item, quantity, price, note, date } = req.body

    // 如果有改 item，仍需確認是原料
    if (item) {
      const found = await Item.findOne({ name: item })
      if (!found) return res.status(400).json({ error: '品項不存在' })
      if (found.type !== 'raw') return res.status(400).json({ error: '入庫僅能是「原料」' })
    }

    const updated = await InRecord.findByIdAndUpdate(
      id,
      {
        ...(item ? { item } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(date ? { date } : {})
      },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: '找不到資料' })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message || '更新失敗' })
  }
})

// 刪除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const r = await InRecord.findByIdAndDelete(id)
    if (!r) return res.status(404).json({ error: '找不到資料' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message || '刪除失敗' })
  }
})

export default router
