import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    items: [
      {
        item: { type: String, required: true, trim: true },
        qty: { type: Number, required: true, min: 0 }
      }
    ],

    // 四費
    stallFee: { type: Number, default: 0 },
    parkingFee: { type: Number, default: 0 },
    treatFee: { type: Number, default: 0 },
    personnelFee: { type: Number, default: 0 },

    // ★ 報表備註
    note: { type: String, default: '' },

    // 快取欄位
    revenueOfDay: { type: Number, default: 0 }, // Σ(份數×售價)
    costOfDay: { type: Number, default: 0 },    // Σ(份數×耗材成本)
    netProfit: { type: Number, default: 0 }     // revenue - cost - 四費
  },
  { timestamps: true }
)

ReportSchema.index({ date: 1 }, { unique: true })

export default mongoose.model('Report', ReportSchema)
