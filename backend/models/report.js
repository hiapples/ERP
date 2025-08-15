import mongoose from 'mongoose'

const ItemQtySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, default: 0 }
  },
  { _id: false }
)

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    itemsQty: { type: [ItemQtySchema], default: [] },     // 多品項份數
    fixedExpense: { type: Number, default: 0 },
    extraExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },

    // 兼容舊資料（可忽略）
    qtyCake: { type: Number, default: 0 },
    qtyJuice: { type: Number, default: 0 }
  },
  { timestamps: true }
)

export default mongoose.model('Report', ReportSchema)
