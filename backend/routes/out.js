// backend/routes/out.js
import express from 'express'
import OutRecord from '../models/out.js'

const router = express.Router()

// 建立出庫
router.post('/', async (req, res) => {
  try {
    const { item, quantity, price, note = '', date } = req.body || {}
    const q = Number(quantity)
    const p = Number(price)

    if (!item || typeof item !== 'string') {
      return res.status(400).json({ message: 'item(原料名稱) 必填' })
    }
    if (!Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ message: 'quantity 必須為大於 0 的數字' })
    }
    if (!Number.isFinite(p) || p < 0) {
      return res.status(400).json({ message: 'price 必須為不小於 0 的數字' })
    }
    if (!date) {
      return res.status(400).json({ message: 'date 必填（YYYY-MM-DD）' })
    }

    const doc = await OutRecord.create({
      item, quantity: q, price: p, note, date
    })
    res.json(doc)
  } catch (err) {
    console.error('[POST /outrecords] error:', err)
    res.status(400).json({ message: err?.message || 'Bad Request' })
  }
})

// 其餘的 GET/PUT/DELETE 保持你原本的行為
export default router
