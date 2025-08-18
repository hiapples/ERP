import express from 'express'
import OutRecord from '../models/out.js'   // ← 確認檔名一致（不是 outRecord.js）
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

// 只用 date 過濾；不要用 item 篩（避免擋掉舊成品名紀錄）
router.get('/', async (req, res) => {
  const q = {}
  if (req.query.date) q.date = String(req.query.date)
  const list = await OutRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 取得某筆
router.get('/:id', async (req, res) => {
  const doc = await OutRecord.findById(req.params.id)
  if (!doc) return res.status(404).json({ error: 'not found' })
  res.json(doc)
})

// 建立（新制建議 item=原料名；但也兼容舊資料）
router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const doc = await OutRecord.create({
      item: norm(b.item),
      quantity: Number(b.quantity),
      price: Number(b.price),
      note: b.note ? String(b.note) : '',
      date: String(b.date)
    })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err?.message || 'create failed' })
  }
})

// 更新
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
    res.status(400).json({ error: err?.message || 'update failed' })
  }
})

// 刪除
router.delete('/:id', async (req, res) => {
  const r = await OutRecord.findByIdAndDelete(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

/** 報表：取某日各成品的成本合計 */
router.get('/total/:date', async (req, res) => {
  const date = String(req.params.date || '')
  if (!date) return res.json({ byItem: {} })

  const items = await Item.find().lean()
  const productSet = new Set(items.filter(i => i.type === 'product').map(i => norm(i.name)))

  const parseProductFromNote = (note) => {
    const n = note || ''
    const m1 = n.match(/由成品[「『"]\s*([^」』"]+?)\s*[」』"]/)
    if (m1?.[1]) return norm(m1[1])
    const m2 = n.match(/由成品\s*["']\s*([^"']+?)\s*["']/)
    if (m2?.[1]) return norm(m2[1])
    const m3 = n.match(/由成品\s*([^\s，,）)]+)\s*轉扣/)
    if (m3?.[1]) return norm(m3[1])
    return ''
  }

  const list = await OutRecord.find({ date }).lean()
  const byItem = {}

  for (const r of list) {
    const itemN = norm(r.item)
    let pname = ''
    if (productSet.has(itemN)) pname = itemN
    else pname = parseProductFromNote(r.note)
    if (!pname) continue
    byItem[pname] = (byItem[pname] || 0) + Number(r.price || 0)
  }

  const byItemDisplay = {}
  for (const it of items.filter(i => i.type === 'product')) {
    const key = norm(it.name)
    if (byItem[key] != null) byItemDisplay[it.name] = byItem[key]
  }

  res.json({ byItem: byItemDisplay })
})

export default router
