import { Router } from 'express'
import OutRecord from '../models/out.js'

const router = Router()
const _arr = (v) => (Array.isArray(v) ? v : (Array.isArray(v?.items) ? v.items : []))
const norm = (v) => (v == null ? '' : String(v).trim())

// 查詢出庫（僅用 date 過濾）
router.get('/', async (req, res) => {
  const q = {}
  if (req.query.date) q.date = norm(req.query.date)
  const list = await OutRecord.find(q).sort({ createdAt: -1 }).lean()
  res.json(_arr(list))
})

// 新增出庫（直接扣原料）
router.post('/', async (req, res) => {
  const b = req.body || {}
  const doc = await OutRecord.create({
    item: norm(b.item),
    quantity: Number(b.quantity || 0),
    price: Number(b.price || 0),
    note: norm(b.note || ''),
    date: norm(b.date)
  })
  res.json(doc)
})

// 更新
router.put('/:id', async (req, res) => {
  const b = req.body || {}
  const doc = await OutRecord.findByIdAndUpdate(
    req.params.id,
    {
      item: norm(b.item),
      quantity: Number(b.quantity || 0),
      price: Number(b.price || 0),
      note: norm(b.note || ''),
      date: norm(b.date)
    },
    { new: true }
  )
  res.json(doc)
})

// 刪除
router.delete('/:id', async (req, res) => {
  await OutRecord.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

/**
 * 指定日的原料成本總表：依 item 分組，合計 price
 * 回傳：{ byRaw: { 原料名: 合計 }, total: 總和 }
 */
router.get('/total/:date', async (req, res) => {
  const date = norm(req.params.date)
  const agg = await OutRecord.aggregate([
    { $match: { date } },
    { $group: { _id: '$item', amt: { $sum: '$price' } } }
  ])

  const byRaw = {}
  let total = 0
  for (const row of agg) {
    const name = row?._id ?? ''
    const val = Number(row?.amt || 0)
    if (name) byRaw[name] = val
    total += val
  }
  res.json({ byRaw, total })
})

export default router
