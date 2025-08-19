import mongoose from 'mongoose'

const RecordSchema = new mongoose.Schema({
  item: { type: String, required: true },      // 原料名
  quantity: { type: Number, required: true },  // g
  price: { type: Number, required: true },     // 整筆價格
  note: { type: String, default: '' },
  date: { type: String, required: true }       // YYYY-MM-DD
}, { timestamps: true })

export default mongoose.model('Record', RecordSchema)
