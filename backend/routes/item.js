// backend/routes/items.js
import { Router } from 'express'
import Item from '../models/item.js'
import InRecord from '../models/in.js'
import OutRecord from '../models/out.js'

const router = Router()

// 取得所有品項
router.get('/', async (_req, res) => {
  const list = await Item.find({}).sort({ createdAt: -1 })
  res.json(list)
})

// 新增品項
router.post('/', async (req, res) => {
  try {
    const { name, salePrice } = req.body
    const doc = await Item.create({ name, salePrice: Number(salePrice || 0) })
    res.json({ ok: true, id: doc._id })
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message })
  }
})

// 更新品項（若名稱變更，級聯更新入/出庫的 item 欄位）
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, salePrice } = req.body

  const old = await Item.findById(id)
  if (!old) return res.status(404).json({ ok: false, message: 'Not found' })

  const nameChanged = name && name !== old.name

  const updated = await Item.findByIdAndUpdate(
    id,
    { name, salePrice: Number(salePrice || 0) },
    { new: true }
  )

  if (nameChanged) {
    await InRecord.updateMany({ item: old.name }, { $set: { item: name } })
    await OutRecord.updateMany({ item: old.name }, { $set: { item: name } })
  }

  res.json({ ok: true, item: updated })
})

// 刪除品項（不刪紀錄）
router.delete('/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
