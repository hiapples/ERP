import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    items: [
      {
        item: { type: String, required: true },  // 成品名稱（只有成品會出現在這）
        qty: { type: Number, required: true }
      }
    ],
    stallFee: { type: Number, default: 0 },
    parkingFee: { type: Number, default: 0 },
    insuranceFee: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'reports' }
)

export default mongoose.model('Report', ReportSchema)
