import mongoose from 'mongoose'

const InRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    // ⬇️ 價格改為「整筆總價」
    price: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('InRecord', InRecordSchema)
