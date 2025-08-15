import mongoose from 'mongoose'

const InRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },        // YYYY-MM-DD
    item: { type: String, required: true },        // 品項
    quantity: { type: Number, required: true, min: 0 }, // 可小數
    price: { type: Number, required: true, min: 0 },    // 整筆金額（不是單價）
    note: { type: String, default: '' }
  },
  { timestamps: true }
)

export default mongoose.model('InRecord', InRecordSchema)
