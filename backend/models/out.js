import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },        // YYYY-MM-DD
    item: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 }, // 可小數
    price: { type: Number, required: true, min: 0 },    // 整筆金額（不是單價）
    note: { type: String, default: '' }
  },
  { timestamps: true }
)

export default mongoose.model('OutRecord', OutRecordSchema)
