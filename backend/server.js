import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import Item from './models/item.js'
import Record from './models/in.js'
import OutRecord from './models/out.js'
import Report from './models/Report.js'

const app = express()
app.use(cors())
app.use(express.json())

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp'
const PORT = process.env.PORT || 8080

await mongoose.connect(MONGODB_URI)

// -------- Items（品項） --------
app.get('/items', async (_req, res) => {
  const list = await Item.find().sort({ createdAt: 1 })
  res.json(list)
})

app.post('/items', async (req, res) => {
  try {
    const { name, salePrice } = req.body
    if (!name || name.trim() === '') return res.status(400).json({ message: 'name 必填' })
    if (isNaN(Number(salePrice)) || Number(salePrice) < 0) return res.status(400).json({ message: 'salePrice 需為 >=0 的數字' })
    const exists = await Item.findOne({ name: name.trim() })
    if (exists) return res.status(409).json({ message: '品項已存在' })
    const it = await Item.create({ name: name.trim(), salePrice: Number(salePrice) })
    res.json(it)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// 更新品項（若名稱變更，連帶把 Record/OutRecord 的 item 一起改）
app.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, salePrice } = req.body
    const it = await Item.findById(id)
    if (!it) return res.status(404).json({ message: '找不到品項' })

    const newName = (name || '').trim()
    if (!newName) return res.status(400).json({ message: 'name 必填' })
    if (isNaN(Number(salePrice)) || Number(salePrice) < 0) return res.status(400).json({ message: 'salePrice 需為 >=0 的數字' })

    // 若要改成已有的別的名稱 => 報錯
    const dup = await Item.findOne({ _id: { $ne: id }, name: newName })
    if (dup) return res.status(409).json({ message: '同名品項已存在' })

    const oldName = it.name
    it.name = newName
    it.salePrice = Number(salePrice)
    await it.save()

    if (oldName !== newName) {
      // 連動更新歷史資料的品項名稱
      await Record.updateMany({ item: oldName }, { $set: { item: newName } })
      await OutRecord.updateMany({ item: oldName }, { $set: { item: newName } })
    }

    res.json(it)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// -------- Records（入庫，價格為整筆） --------
app.get('/records', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await Record.find(q).sort({ createdAt: -1 })
  res.json(list)
})

// 支援單筆或陣列
app.post('/records', async (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [req.body]
  const docs = body.map(b => ({
    item: b.item,
    quantity: Number(b.quantity),
    price: Number(b.price), // 整筆金額
    note: b.note || '',
    date: b.date
  }))
  const inserted = await Record.insertMany(docs)
  res.json({ inserted: inserted.length })
})

app.put('/records/:id', async (req, res) => {
  const { id } = req.params
  const doc = await Record.findByIdAndUpdate(id, req.body, { new: true })
  res.json(doc)
})

app.delete('/records/:id', async (req, res) => {
  const { id } = req.params
  await Record.findByIdAndDelete(id)
  res.json({ ok: true })
})

// -------- OutRecords（出庫，儲存「平均單價×數量」的整筆金額）--------
app.get('/outrecords', async (req, res) => {
  const { date, item } = req.query
  const q = {}
  if (date) q.date = date
  if (item) q.item = item
  const list = await OutRecord.find(q).sort({ createdAt: -1 })
  res.json(list)
})

app.post('/outrecords', async (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [req.body]
  const docs = body.map(b => ({
    item: b.item,
    quantity: Number(b.quantity),
    price: Number(b.price), // 整筆金額（前端已計算平均單價×數量）
    note: b.note || '',
    date: b.date
  }))
  const inserted = await OutRecord.insertMany(docs)
  res.json({ inserted: inserted.length })
})

app.put('/outrecords/:id', async (req, res) => {
  const { id } = req.params
  const doc = await OutRecord.findByIdAndUpdate(id, req.body, { new: true })
  res.json(doc)
})

app.delete('/outrecords/:id', async (req, res) => {
  const { id } = req.params
  await OutRecord.findByIdAndDelete(id)
  res.json({ ok: true })
})

// 報表用：某日兩個群組（檸檬汁、蘋果汁）的整筆成本加總
app.get('/outrecords/total/:date', async (req, res) => {
  const date = req.params.date
  const list = await OutRecord.find({ date })
  const totalGroup1 = list.filter(r => r.item === '檸檬汁').reduce((s, r) => s + Number(r.price), 0)
  const totalGroup2 = list.filter(r => r.item === '蘋果汁').reduce((s, r) => s + Number(r.price), 0)
  res.json({ totalGroup1, totalGroup2 })
})

// -------- Reports --------
app.get('/reports', async (_req, res) => {
  const list = await Report.find().sort({ date: -1 })
  res.json(list)
})
app.get('/reports/:date', async (req, res) => {
  const r = await Report.findOne({ date: req.params.date })
  res.json(r)
})
app.post('/reports', async (req, res) => {
  const { date, qtyCake, qtyJuice, fixedExpense, extraExpense, netProfit } = req.body
  const up = await Report.findOneAndUpdate(
    { date },
    { $set: { qtyCake, qtyJuice, fixedExpense, extraExpense, netProfit } },
    { new: true, upsert: true }
  )
  res.json(up)
})
app.delete('/reports/:date', async (req, res) => {
  await Report.findOneAndDelete({ date: req.params.date })
  res.json({ ok: true })
})

app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
