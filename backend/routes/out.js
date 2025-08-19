import express from 'express'
import OutRecord from '../models/out.js'
import Item from '../models/item.js'

const router = express.Router()
const norm = (v) => (v == null ? '' : String(v).trim())

/** 只支援 date 過濾（避免舊成品名被擋） */
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

/** 取得單筆 */
router.get('/:id', async (req, res) => {
  try {
    const doc = await OutRecord.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'fetch failed' })
  }
})

/** 建立出庫：建議新制 item=原料名，productName=成品名（雙綁請前端拆兩筆呼叫） */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const payload = {
      item: norm(b.item),
      quantity: Number(b.quantity),
      price: Number(b.price),
      note: b.note ? String(b.note) : '',
      date: String(b.date),
      productName: norm(b.productName || '')
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
    if (b.productName !== undefined) payload.productName = norm(b.productName)

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
 * 規則（優先序）：
 *  1) 若 OutRecord 有 productName → 直接歸到該成品
 *  2) 否則嘗試從 note 解析（支援「桑葚汁(瓶)0.10元」或「由成品『X』轉扣」）
 *  3) 再否，若僅有一個成品綁定該原料 → 安全 fallback
 *  4) 最後，若 item 本身是成品名（舊制） → 也歸入
 * 回傳：{ byItem: { '成品A': 123.45, '成品B': 67.89 } }
 */
router.get('/total/:date', async (req, res) => {
  try {
    const date = String(req.params.date || '')
    if (!date) return res.json({ byItem: {} })

    const items = await Item.find().lean()
    const products = items.filter(i => i.type === 'product')
    const productSet = new Set(products.map(i => norm(i.name)))

    // 原料 → 哪些成品綁定（第一綁定為主；你也可自行擴充第二綁定關聯）
    const bindMap = {}
    for (const p of products) {
      const r1 = norm(p.bindRaw)
      if (r1) {
        bindMap[r1] ||= []
        bindMap[r1].push(norm(p.name))
      }
      const r2 = norm(p.bindRaw2)
      if (r2) {
        bindMap[r2] ||= []
        bindMap[r2].push(norm(p.name))
      }
    }

    const parseProductFromNote = (note) => {
      const n = note || ''
      const m1 = n.match(/由成品[「『"]\s*([^」』"]+?)\s*[」』"]/)
      if (m1?.[1]) return norm(m1[1])
      const m2 = n.match(/由成品\s*["']\s*([^"']+?)\s*["']/)
      if (m2?.[1]) return norm(m2[1])
      const m3 = n.match(/由成品\s*([^\s，,）)]+)\s*轉扣/)
      if (m3?.[1]) return norm(m3[1])
      // 新格式：<Product><unit>元
      const m4 = n.match(/^(.+?)\s*([0-9]+(?:\.[0-9]+)?)\s*元$/)
      if (m4?.[1]) return norm(m4[1])
      return ''
    }

    const list = await OutRecord.find({ date }).lean()
    const byItem = {}

    for (const r of list) {
      const price = Number(r.price || 0)
      const itemN = norm(r.item)
      let pNameN = norm(r.productName || '')

      if (!pNameN) {
        // 若 item 原本就是成品名（舊制）
        if (productSet.has(itemN)) {
          pNameN = itemN
        } else {
          // 新制：item 是原料名 → 從備註取
          pNameN = parseProductFromNote(r.note)
          if (!pNameN && bindMap[itemN]?.length === 1) {
            pNameN = bindMap[itemN][0]
          }
        }
      }

      if (!pNameN) continue
      byItem[pNameN] = (byItem[pNameN] || 0) + price
    }

    // 以顯示名回傳（保留大小寫）
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
