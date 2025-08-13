import mongoose from 'mongoose'

const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true }, // 檸檬汁 / 蘋果汁 的原料名
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // 使用當時的平均單價
    note: { type: String, default: '' },
    date: { type: String, required: true } // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('OutRecord', OutRecordSchema)
