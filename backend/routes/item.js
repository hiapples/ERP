// backend/routes/items.js
import express from 'express'
import Item from '../models/item.js'
import Record from '../models/in.js'
import OutRecord from '../models/out.js'

const router = express.Router()
const n2 = (v) => Number(Number(v || 0).toFixed(2))

// 取得全部品項
router.get('/', async (_req, res) => {
  const list = await Item.find().sort({ createdAt: 1 })
  res.json(list)
})

// 取得單一品項
router.get('/:id', async (req, res) => {
  const doc = await Item.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: '找不到品項' })
  res.json(doc)
})

// 新增品項
router.post('/', async (req, res) => {
  try {
    const name = String((req.body.name || '').trim())
    const salePrice = Number(req.body.salePrice)
    if (!name) return res.status(400).json({ message: 'name 必填' })
    if (Number.isNaN(salePrice) || salePrice < 0) {
      return res.status(400).json({ message: 'salePrice 需為 >= 0 的數字' })
    }

    const exists = await Item.findOne({ name })
    if (exists) return res.status(409).json({ message: '品項已存在' })

    const doc = await Item.create({ name, salePrice: n2(salePrice) })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// 更新品項（如改名：連動更新歷史入/出庫的 item 欄位）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const name = String((req.body.name || '').trim())
    const salePrice = Number(req.body.salePrice)

    if (!name) return res.status(400).json({ message: 'name 必填' })
    if (Number.isNaN(salePrice) || salePrice < 0) {
      return res.status(400).json({ message: 'salePrice 需為 >= 0 的數字' })
    }

    const item = await Item.findById(id)
    if (!item) return res.status(404).json({ message: '找不到品項' })

    const dup = await Item.findOne({ _id: { $ne: id }, name })
    if (dup) return res.status(409).json({ message: '同名品項已存在' })

    const oldName = item.name
    item.name = name
    item.salePrice = n2(salePrice)
    await item.save()

    // 若名稱有變更，連動歷史資料
    if (oldName !== name) {
      await Record.updateMany({ item: oldName }, { $set: { item: name } })
      await OutRecord.updateMany({ item: oldName }, { $set: { item: name } })
    }

    res.json(item)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// 刪除品項（若已有出入庫紀錄，阻擋刪除避免資料殘缺）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const item = await Item.findById(id)
    if (!item) return res.status(404).json({ message: '找不到品項' })

    const usedInIn = await Record.exists({ item: item.name })
    const usedInOut = await OutRecord.exists({ item: item.name })
    if (usedInIn || usedInOut) {
      return res.status(409).json({ message: '已有出/入庫紀錄，無法刪除此品項' })
    }

    await Item.findByIdAndDelete(id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

export default router
