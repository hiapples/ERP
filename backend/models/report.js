// backend/models/report.js  (ESM)
import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD

    // 只存成品（name 對應 items 集合裡 type='product' 的 name）
    items: [
      {
        item: { type: String, required: true },
        qty: { type: Number, required: true, default: 0 },
      },
    ],

    // 六費用（新）
    stallFee: { type: Number, default: 0 },      // 攤販費
    parkingFee: { type: Number, default: 0 },    // 停車費
    insuranceFee: { type: Number, default: 0 },  // 保險費
    treatFee: { type: Number, default: 0 },      // 請客費（原優待費）
    personnelFee: { type: Number, default: 0 },  // 人事費
    guildFee: { type: Number, default: 0 },      // 公會費

    // 舊欄位相容（可選，方便舊前端/舊匯出）
    discountFee: { type: Number, default: 0 },       // 舊：優待費
    preferentialFee: { type: Number, default: 0 },   // 舊別名
    fixedExpense: { type: Number, default: 0 },      // 舊對應攤販費
    extraExpense: { type: Number, default: 0 },      // 舊對應保險費

    // 彙總欄位（後端計算）
    revenueOfDay: { type: Number, default: 0 },  // Σ(成品 qty * salePrice)
    costOfDay: { type: Number, default: 0 },     // 原料成本 + Σ(成品 qty * 耗材)
    netProfit: { type: Number, default: 0 },     // 營收 - 成本 - 六費用
  },
  { timestamps: true, collection: 'reports' }
)

export default mongoose.model('Report', ReportSchema)
