// backend/routes/out.js
import express from 'express'
import OutRecord from '../models/out.js'
import Item from '../models/item.js'

const router = express.Router()

// 查詢
router.get('/', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await OutRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 新增（限制只能出庫成品；整筆金額強制 0）
router.post('/', async (req, res) => {
  try {
    const { item, quantity, note = '', date } = req.body
    if (!item || !date) return res.status(400).json({ error: '缺少 item 或 date' })

    const found = await Item.findOne({ name: item })
    if (!found) return res.status(400).json({ error: '品項不存在' })
    if (found.type !== 'product') return res.status(400).json({ error: '只能出庫「成品」' })

    const payload = {
      item,
      quantity: Number(quantity || 0),
      price: 0, // 本版規格：成品出庫不記成本金額
      note,
      date
    }
    if (payload.quantity <= 0) return res.status(400).json({ error: '數量必須 > 0' })

    const created = await OutRecord.create(payload)
    res.json(created)
  } catch (e) {
    res.status(500).json({ error: e.message || '新增出庫失敗' })
  }
})

// 更新（不允許把成品改成原料；金額仍固定為 0）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { item, quantity, note, date } = req.body

    if (item) {
      const found = await Item.findOne({ name: item })
      if (!found) return res.status(400).json({ error: '品項不存在' })
      if (found.type !== 'product') return res.status(400).json({ error: '出庫僅能是成品' })
    }

    const updated = await OutRecord.findByIdAndUpdate(
      id,
      {
        ...(item ? { item } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(date ? { date } : {}),
        price: 0
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
    const r = await OutRecord.findByIdAndDelete(id)
    if (!r) return res.status(404).json({ error: '找不到資料' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message || '刪除失敗' })
  }
})

// 取得某日整體出庫金額（依品項彙總）
router.get('/total/:date', async (req, res) => {
  const { date } = req.params
  const list = await OutRecord.find({ date })
  const byItem = {}
  let total = 0
  for (const r of list) {
    byItem[r.item] = (byItem[r.item] || 0) + Number(r.price || 0)
    total += Number(r.price || 0)
  }
  res.json({ total, byItem })
})

export default router
