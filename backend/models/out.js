// backend/models/outRecord.js
import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema({
  item:     { type: String, required: true, trim: true }, // 原料名稱
  quantity: { type: Number, required: true, min: 0.000001 },
  price:    { type: Number, required: true, min: 0 },     // 整筆金額，可為 0
  note:     { type: String, default: '' },
  date:     { type: String, required: true }              // 'YYYY-MM-DD'
}, { timestamps: true })

const OutRecord = mongoose.model('OutRecord', OutRecordSchema)
export default OutRecord
export { OutRecord }
