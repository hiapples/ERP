// backend/routes/reports.js
const express = require('express')
const router = express.Router()
const Report = require('../models/report')
const Item = require('../models/item')
const OutRecord = require('../models/out')

/**
 * 依日期計算：
 * revenueOfDay = Σ(成品 qty * salePrice)
 * baseRawCost  = 該日所有 OutRecord 價格合計
 * extraCost    = Σ(成品 qty * consumableCost)
 * costOfDay    = baseRawCost + extraCost
 * netProfit    = revenueOfDay - costOfDay - 六費用
 */
async function computeDayTotals(date, itemsRows, fees) {
  const products = await Item.find({ type: 'product' })
  const priceMap = {}
  const extraMap = {}
  for (var i = 0; i < products.length; i++) {
    priceMap[products[i].name] = Number(products[i].salePrice || 0)
    extraMap[products[i].name]  = Number(products[i].consumableCost || 0)
  }

  let revenue = 0
  let extraCost = 0
  for (var j = 0; j < itemsRows.length; j++) {
    const row = itemsRows[j]
    const name = String(row.item || '')
    const qty  = Number(row.qty || 0)
    revenue   += qty * (priceMap[name] || 0)
    extraCost += qty * (extraMap[name] || 0)
  }

  const outs = await OutRecord.find({ date: date })
  let baseRawCost = 0
  for (var k = 0; k < outs.length; k++) baseRawCost += Number(outs[k].price || 0)

  const cost = baseRawCost + extraCost
  const totalFees =
    Number(fees.stallFee || 0) + Number(fees.parkingFee || 0) + Number(fees.insuranceFee || 0) +
    Number(fees.treatFee || 0) + Number(fees.personnelFee || 0) + Number(fees.guildFee || 0)

  const net = revenue - cost - totalFees
  return { revenueOfDay: revenue, costOfDay: cost, netProfit: net }
}

// 取得所有報表（簡表）
router.get('/', async function (req, res) {
  const list = await Report.find().sort({ date: -1 })
  res.json(list)
})

// 取得某日報表
router.get('/:date', async function (req, res) {
  const date = String(req.params.date || '')
  const doc = await Report.findOne({ date: date })
  if (!doc) return res.json(null)
  res.json(doc)
})

// 新增/覆寫某日報表（idempotent）
router.post('/', async function (req, res) {
  const b = req.body || {}
  const date = String(b.date || '')
  const itemsRows = Array.isArray(b.items) ? b.items.map(function (r) {
    return { item: String(r.item || ''), qty: Number(r.qty || 0) }
  }) : []

  // 新六費用（後端以新欄位為主）
  const fees = {
    stallFee: Number(b.stallFee || 0),
    parkingFee: Number(b.parkingFee || 0),
    insuranceFee: Number(b.insuranceFee || 0),
    treatFee: Number(b.treatFee != null ? b.treatFee : (b.discountFee != null ? b.discountFee : b.preferentialFee) || 0),
    personnelFee: Number(b.personnelFee || 0),
    guildFee: Number(b.guildFee || 0)
  }

  const totals = await computeDayTotals(date, itemsRows, fees)

  const doc = await Report.findOneAndUpdate(
    { date: date },
    {
      $set: {
        date: date,
        items: itemsRows,

        // 六費用（新）
        stallFee: fees.stallFee,
        parkingFee: fees.parkingFee,
        insuranceFee: fees.insuranceFee,
        treatFee: fees.treatFee,
        personnelFee: fees.personnelFee,
        guildFee: fees.guildFee,

        // 舊欄位相容性寫入（方便舊前端、舊匯出）
        discountFee: fees.treatFee,
        preferentialFee: fees.treatFee,
        fixedExpense: fees.stallFee,
        extraExpense: fees.insuranceFee,

        revenueOfDay: Number(totals.revenueOfDay.toFixed(2)),
        costOfDay: Number(totals.costOfDay.toFixed(2)),
        netProfit: Number(totals.netProfit.toFixed(2))
      }
    },
    { upsert: true, new: true }
  )

  res.json(doc)
})

// 刪除某日報表
router.delete('/:date', async function (req, res) {
  const date = String(req.params.date || '')
  await Report.deleteOne({ date: date })
  res.json({ ok: 1 })
})

module.exports = router
