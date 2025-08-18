// backend/models/out.js
import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    // 可能是「原料名」（新制）或「成品名」（舊資料）
    item: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // 整筆金額
    note: { type: String, default: '' },
    date: { type: String, required: true }           // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('OutRecord', OutRecordSchema)
export { OutRecordSchema }
