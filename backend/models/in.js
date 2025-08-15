import mongoose from 'mongoose'

const recordSchema = new mongoose.Schema({
  item: { type: String, required: true },      // 品項名稱（字串，跟 Item.name 對應）
  quantity: { type: Number, required: true },   // 可含小數
  price: { type: Number, required: true },      // 整筆金額
  note: { type: String, default: '' },
  date: { type: String, required: true }        // YYYY-MM-DD
}, { timestamps: true })

export default mongoose.model('Record', recordSchema)
