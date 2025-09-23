// backend/models/Report.js
const mongoose = require('mongoose')

const ReportSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
  items: [{
    item: { type: String, required: true }, // 成品名稱（Item.type = product）
    qty: { type: Number, required: true }
  }],

  // 六費用（新）
  stallFee: { type: Number, default: 0 },      // 攤販費
  parkingFee: { type: Number, default: 0 },    // 停車費
  insuranceFee: { type: Number, default: 0 },  // 保險費
  treatFee: { type: Number, default: 0 },      // 請客費（優待費更名）
  personnelFee: { type: Number, default: 0 },  // 人事費
  guildFee: { type: Number, default: 0 },      // 公會費

  // 舊欄位相容存一份（非必填）
  discountFee: { type: Number, default: 0 },       // 舊：優待費
  preferentialFee: { type: Number, default: 0 },   // 舊別名
  fixedExpense: { type: Number, default: 0 },      // 舊對應 stallFee
  extraExpense: { type: Number, default: 0 },      // 舊對應 insuranceFee

  // 系統計算
  revenueOfDay: { type: Number, default: 0 },  // Σ(成品 qty*售價)
  costOfDay: { type: Number, default: 0 },     // 原料成本 + Σ(成品 qty*耗材)
  netProfit: { type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('Report', ReportSchema)
