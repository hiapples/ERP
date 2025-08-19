import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },        // 原料名稱（不綁定成品，直接原料）
    quantity: { type: Number, required: true },    // g
    price: { type: Number, required: true },       // 整筆成本（平均單價 × g）
    note: { type: String, default: '' },
    date: { type: String, required: true }         // YYYY-MM-DD
  },
  { timestamps: true, collection: 'outrecords' }
)

export default mongoose.model('OutRecord', OutRecordSchema)
