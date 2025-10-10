import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },   // YYYY-MM-DD
    items: [
      {
        item: { type: String, required: true, trim: true }, // 成品名稱
        qty: { type: Number, required: true, min: 0 }
      }
    ],
    stallFee: { type: Number, default: 0 },
    parkingFee: { type: Number, default: 0 },
    treatFee: { type: Number, default: 0 },
    personnelFee: { type: Number, default: 0 },

    // 快取欄位（讀取時若不存在也可臨時計算）
    revenueOfDay: { type: Number, default: 0 },
    costOfDay: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }
  },
  { timestamps: true }
)

ReportSchema.index({ date: 1 }, { unique: true })

export default mongoose.model('Report', ReportSchema)
