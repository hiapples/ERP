// backend/models/Item.js
import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    salePrice: { type: Number, required: true, default: 0 }, // 售價
  },
  { timestamps: true }
)

ItemSchema.index({ name: 1 }, { unique: true })

export default mongoose.models.Item || mongoose.model('Item', ItemSchema)
