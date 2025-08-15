import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },      // 以名稱存參照
    quantity: { type: Number, required: true },  // 可含小數
    price: { type: Number, required: true },     // 整筆金額（平均單價×數量）
    note: { type: String, default: '' },
    date: { type: String, required: true }       // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('OutRecord', OutRecordSchema)
