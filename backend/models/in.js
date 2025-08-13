import mongoose from 'mongoose'

const InRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: '' },
    date: { type: String, required: true } // YYYY-MM-DD
  },
  { timestamps: true }
)

export default mongoose.model('InRecord', InRecordSchema)
