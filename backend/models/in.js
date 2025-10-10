import mongoose from 'mongoose'

const RecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },  // 成品名稱
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },     // 整筆入庫總成本
    note: { type: String, default: '' },
    date: { type: String, required: true }               // YYYY-MM-DD
  },
  { timestamps: true }
)

RecordSchema.index({ date: 1 })
RecordSchema.index({ item: 1, date: 1 })

export default mongoose.model('Record', RecordSchema)
