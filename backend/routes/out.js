// backend/routes/out.js
import express from 'express'
import OutRecord from '../models/out.js'
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

// 只用 date 過濾；不要在後端用 item 篩，避免舊資料(成品名)被擋掉
router.get('/', async (req, res) => {
  const q = {}
  if (req.query.date) q.date = String(req.query.date)
  const list = await OutRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 依 id 取得（可選）
router.get('/:id', async (req, res) => {
  const doc = await OutRecord.findById(req.params.id)
  if (!doc) return res.status(404).json({ error: 'not found' })
  res.json(doc)
})

// 建立出庫（新制建議 item=原料名；舊資料可能是成品名）
router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const payload = {
      item: norm(b.item),
      quantity: Number(b.quantity),
      price: Number(b.price),
      note: b.note ? String(b.note) : '',
      date: String(b.date)
    }
    if (!payload.item || !payload.date) return res.status(400).json({ error: 'item/date 必填' })
    if (!(payload.quantity > 0)) return res.status(400).json({ error: 'quantity 必須 > 0' })
    if (!(payload.price >= 0)) return res.status(400).json({ error: 'price 必須 >= 0' })

    const doc = await OutRecord.create(payload)
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'create failed' })
  }
})

// 更新出庫
router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {}
    const payload = {}
    if (b.item !== undefined) payload.item = norm(b.item)
    if (b.quantity !== undefined) payload.quantity = Number(b.quantity)
    if (b.price !== undefined) payload.price = Number(b.price)
    if (b.note !== undefined) payload.note = String(b.note || '')
    if (b.date !== undefined) payload.date = String(b.date || '')

    const doc = await OutRecord.findByIdAndUpdate(req.params.id, payload, { new: true })
    if (!doc) return res.status(404).json({ error: 'not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'update failed' })
  }
})

// 刪除出庫
router.delete('/:id', async (req, res) => {
  const r = await OutRecord.findByIdAndDelete(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

/**
 * 取得某日「各成品」的成本總額（給前端報表用）
 * 規則：
 * - 若 outrecords.item 是成品名 → 直接歸到該成品
 * - 若 outrecords.item 是原料名 → 嘗試從 note 解析「由成品「X」轉扣」拿到成品名
 *  （前端送出的 note 就是這格式）
 * 回傳格式：{ byItem: { '成品A': 123.45, '成品B': 67.89 } }
 */
router.get('/total/:date', async (req, res) => {
  const date = String(req.params.date || '')
  if (!date) return res.json({ byItem: {} })

  const items = await Item.find().lean()
  const productSet = new Set(items.filter(i => i.type === 'product').map(i => norm(i.name)))

  // 解析 note 裡的成品名：「由成品「X」轉扣」
  const parseProductFromNote = (note) => {
    const n = note || ''
    // 支援中文/英文引號
    const m1 = n.match(/由成品[「『"]\s*([^」』"]+?)\s*[」』"]/)
    if (m1 && m1[1]) return norm(m1[1])
    const m2 = n.match(/由成品\s*["']\s*([^"']+?)\s*["']/)
    if (m2 && m2[1]) return norm(m2[1])
    // 退而求其次：由成品XXX轉扣
    const m3 = n.match(/由成品\s*([^\s，,）)]+)\s*轉扣/)
    if (m3 && m3[1]) return norm(m3[1])
    return ''
  }

  const list = await OutRecord.find({ date }).lean()
  const byItem = {}

  for (const r of list) {
    let pname = '' // 成品名（正規化）
    const itemN = norm(r.item)
    if (productSet.has(itemN)) {
      // 舊資料直接記成品名
      pname = itemN
    } else {
      // 新制：從備註抓成品名
      pname = norm(parseProductFromNote(r.note))
    }
    if (!pname) continue
    byItem[pname] = (byItem[pname] || 0) + Number(r.price || 0)
  }

  // 轉回前端友善鍵（保留原大小寫/顯示名）
  const byItemDisplay = {}
  for (const it of items.filter(i => i.type === 'product')) {
    const key = norm(it.name)
    if (byItem[key] != null) byItemDisplay[it.name] = byItem[key]
  }

  res.json({ byItem: byItemDisplay })
})

export default router
