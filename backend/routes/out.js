import express from 'express'
import OutRecord from '../models/out.js' // ← 路徑對齊你的檔名
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

/** 取得出庫清單：只支援 date 過濾（避免舊成品名被擋） */
router.get('/', async (req, res) => {
  try {
    const q = {}
    if (req.query.date) q.date = String(req.query.date)
    const list = await OutRecord.find(q).sort({ createdAt: -1 })
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'fetch outrecords failed' })
  }
})

/** 取得單筆（可選） */
router.get('/:id', async (req, res) => {
  try {
    const doc = await OutRecord.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'fetch failed' })
  }
})

/** 建立出庫（新制建議 item=原料名；仍相容舊資料 item=成品名） */
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
    if (!payload.item || !payload.date) {
      return res.status(400).json({ error: 'item/date 必填' })
    }
    if (!(payload.quantity > 0)) {
      return res.status(400).json({ error: 'quantity 必須 > 0' })
    }
    if (!(payload.price >= 0)) {
      return res.status(400).json({ error: 'price 必須 >= 0' })
    }

    const doc = await OutRecord.create(payload)
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'create failed' })
  }
})

/** 更新出庫 */
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

/** 刪除出庫 */
router.delete('/:id', async (req, res) => {
  try {
    const r = await OutRecord.findByIdAndDelete(req.params.id)
    if (!r) return res.status(404).json({ error: 'not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'delete failed' })
  }
})

/**
 * 報表：取某日各「成品」的銷貨成本總額
 * 規則：
 *  - 若 outrecords.item 是成品名 → 直接歸到該成品
 *  - 若 outrecords.item 是原料名 → 從 note 解析「由成品「X」轉扣」，取得成品名
 *  - 若 note 缺失，且只有唯一一個成品綁定該原料 → fallback 歸戶到那個成品
 * 回傳：{ byItem: { '成品A': 123.45, '成品B': 67.89 } }
 */
router.get('/total/:date', async (req, res) => {
  try {
    const date = String(req.params.date || '')
    if (!date) return res.json({ byItem: {} })

    const items = await Item.find().lean()
    const products = items.filter(i => i.type === 'product')
    const productSet = new Set(products.map(i => norm(i.name)))

    // 原料 → 綁定它的成品（可能多個）
    const bindMap = {}
    for (const p of products) {
      const rn = norm(p.bindRaw)
      if (!rn) continue
      bindMap[rn] ||= []
      bindMap[rn].push(norm(p.name))
    }

    // 從備註擷取成品名：同時支援舊/新格式
    const parseProductFromNote = (note) => {
      const n = note || ''

      // 舊格式：由成品「X」轉扣，單價=0.10
      const m1 = n.match(/由成品[「『"]\s*([^」』"]+?)\s*[」』"]/)
      if (m1?.[1]) return norm(m1[1])

      const m2 = n.match(/由成品\s*["']\s*([^"']+?)\s*["']/)
      if (m2?.[1]) return norm(m2[1])

      const m3 = n.match(/由成品\s*([^\s，,）)]+)\s*轉扣/)
      if (m3?.[1]) return norm(m3[1])

      // ★新格式：桑葚汁(瓶)0.10元 → 把「最後的數字＋元」視為單價，其前面全部視為成品名
      const m4 = n.match(/^(.+?)\s*([0-9]+(?:\.[0-9]+)?)\s*元$/)
      if (m4?.[1]) return norm(m4[1])

      return ''
    }

    const list = await OutRecord.find({ date }).lean()
    const byItem = {}

    for (const r of list) {
      const itemN = norm(r.item)
      let pNameN = ''

      if (productSet.has(itemN)) {
        // 舊資料：item 即為成品名
        pNameN = itemN
      } else {
        // 新制：item 是原料名 → 優先從備註取成品名
        pNameN = parseProductFromNote(r.note)
        // 備註沒有 → 如果只有一個成品綁定該原料，做安全 fallback
        if (!pNameN && bindMap[itemN]?.length === 1) {
          pNameN = bindMap[itemN][0]
        }
      }

      if (!pNameN) continue
      byItem[pNameN] = (byItem[pNameN] || 0) + Number(r.price || 0)
    }

    // 轉回顯示名（保留大小寫/原樣）
    const byItemDisplay = {}
    for (const p of products) {
      const key = norm(p.name)
      if (byItem[key] != null) byItemDisplay[p.name] = byItem[key]
    }

    res.json({ byItem: byItemDisplay })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'aggregate total failed' })
  }
})

export default router
