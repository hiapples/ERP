// backend/models/InRecord.js
import mongoose from 'mongoose'

const InRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },       // 文字名稱（會跟 Item.name 一致）
    quantity: { type: Number, required: true },   // 可小數
    price: { type: Number, required: true },      // 整筆金額
    note: { type: String, default: '' },
    date: { type: String, required: true }        // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('InRecord', InRecordSchema)
