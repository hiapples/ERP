// backend/models/OutRecord.js
import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    quantity: { type: Number, required: true },   // 可小數
    price: { type: Number, required: true },      // 整筆金額（平均單價 × 數量）
    note: { type: String, default: '' },
    date: { type: String, required: true }
  },
  { timestamps: true }
)

export default mongoose.model('OutRecord', OutRecordSchema)
