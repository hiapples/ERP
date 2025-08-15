import express from 'express'
import OutRecord from '../models/out.js'
import Item from '../models/item.js'

const router = express.Router()

// 取得出庫資料（可加 query: date, item）
router.get('/', async (req, res) => {
  const { date, item } = req.query
  const cond = {}
  if (date) cond.date = date
  if (item) cond.item = item
  const list = await OutRecord.find(cond).sort({ createdAt: -1 })
  res.json(list)
})

// 新增出庫：支援「單筆」或「陣列」
// 注意：price 為整筆金額（前端已用平均單價×數量算好）
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

// 更新
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

// 刪除
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  await OutRecord.findByIdAndDelete(id)
  res.json({ ok: true })
})

/**
 * 報表用：計算某日兩個主要品項的「銷貨成本」（整筆金額加總）
 * 取 items 集合中的前兩個（createdAt 早→晚）
 * 回傳：{ totalGroup1, totalGroup2, item1Name, item2Name }
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

export default router
