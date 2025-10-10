import mongoose from 'mongoose'
const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['product'], default: 'product', index: true },
    salePrice: { type: Number, default: 0 } // 只保留售價，用於計算營收
  },
  { timestamps: true }
)
ItemSchema.index({ name: 1 }, { unique: true })
export default mongoose.model('Item', ItemSchema)
