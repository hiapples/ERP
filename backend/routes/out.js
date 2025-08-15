import express from 'express'
import OutRecord from '../models/out.js'
import Item from '../models/item.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const { date, item } = req.query
  const cond = {}
  if (date) cond.date = date
  if (item) cond.item = item
  const list = await OutRecord.find(cond).sort({ createdAt: -1 })
  res.json(list)
})

router.post('/', async (req, res) => {
  const body = req.body
  const toSave = Array.isArray(body) ? body : [body]
  const docs = toSave.map(r => ({
    item: r.item,
    quantity: Number(r.quantity),
    price: Number(Number(r.price).toFixed(2)), // 整筆金額
    note: r.note || '',
    date: r.date
  }))
  const ret = await OutRecord.insertMany(docs)
  res.json({ inserted: ret.length, ids: ret.map(d => d._id) })
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const r = req.body || {}
  const doc = await OutRecord.findByIdAndUpdate(
    id,
    {
      $set: {
        item: r.item,
        quantity: Number(r.quantity),
        price: Number(Number(r.price).toFixed(2)),
        note: r.note || '',
        date: r.date
      }
    },
    { new: true }
  )
  res.json(doc)
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await OutRecord.findByIdAndDelete(id)
  res.json({ ok: true })
})

/**
 * 舊：回傳前兩品項的成本合計（保留相容）
 */
router.get('/total/:date', async (req, res) => {
  const { date } = req.params
  const items = await Item.find({}).sort({ createdAt: 1 }).limit(2)
  const [i1, i2] = items
  const name1 = i1?.name
  const name2 = i2?.name

  const sumFor = async (name) => {
    if (!name) return 0
    const list = await OutRecord.find({ date, item: name })
    return list.reduce((s, r) => s + Number(r.price || 0), 0)
  }

  const totalGroup1 = Number((await sumFor(name1)).toFixed(2))
  const totalGroup2 = Number((await sumFor(name2)).toFixed(2))

  res.json({ totalGroup1, totalGroup2, item1Name: name1 || '', item2Name: name2 || '' })
})

/**
 * 新：回傳該日「每個品項」的成本合計
 * { totals: { [itemName]: number } }
 */
router.get('/totalByItem/:date', async (req, res) => {
  const { date } = req.params
  const list = await OutRecord.find({ date })
  const totals = {}
  for (const r of list) {
    totals[r.item] = (totals[r.item] || 0) + Number(r.price || 0)
  }
  // 固定到兩位小數
  for (const k of Object.keys(totals)) {
    totals[k] = Number(totals[k].toFixed(2))
  }
  res.json({ totals })
})

export default router
