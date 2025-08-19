import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema({
  item: { type: String, required: true },          // 原料名（新制）
  quantity: { type: Number, required: true },      // g
  price: { type: Number, required: true },         // 整筆價格
  note: { type: String, default: '' },
  date: { type: String, required: true },          // YYYY-MM-DD
  productName: { type: String, default: '' }       // 對應成品名（新制用）
}, { timestamps: true })

export default mongoose.model('OutRecord', OutRecordSchema)
