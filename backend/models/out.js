import mongoose from 'mongoose'
const OutRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    date: { type: String, required: true } // YYYY-MM-DD
  },
  { timestamps: true }
)
OutRecordSchema.index({ date: 1 })
OutRecordSchema.index({ item: 1, date: 1 })
export default mongoose.model('OutRecord', OutRecordSchema)
