import mongoose from 'mongoose'
const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    items: [{ item: { type: String, required: true, trim: true }, qty: { type: Number, required: true, min: 0 } }],
    stallFee: { type: Number, default: 0 },
    parkingFee: { type: Number, default: 0 },
    treatFee: { type: Number, default: 0 },
    personnelFee: { type: Number, default: 0 },

    // 快取欄位（不含成本）
    revenueOfDay: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 } // = revenueOfDay - 四費用
  },
  { timestamps: true }
)
ReportSchema.index({ date: 1 }, { unique: true })
export default mongoose.model('Report', ReportSchema)
