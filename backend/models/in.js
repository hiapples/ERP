import mongoose from 'mongoose'

const InRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },        // 原料名稱
    quantity: { type: Number, required: true },    // g
    price: { type: Number, required: true },       // 整筆價格
    note: { type: String, default: '' },
    date: { type: String, required: true }         // YYYY-MM-DD
  },
  { timestamps: true, collection: 'records' }
)

export default mongoose.model('InRecord', InRecordSchema)
