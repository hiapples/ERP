import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },  // 成品名稱
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },     // 整筆出庫成本（avgCost × qty）
    note: { type: String, default: '' },
    date: { type: String, required: true }               // YYYY-MM-DD
  },
  { timestamps: true }
)

OutRecordSchema.index({ date: 1 })
OutRecordSchema.index({ item: 1, date: 1 })

export default mongoose.model('OutRecord', OutRecordSchema)
