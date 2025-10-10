import mongoose from 'mongoose'
const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['product'], default: 'product', index: true },
    salePrice: { type: Number, default: 0 },        // 售價（營收用）
    consumableCost: { type: Number, default: 0 }    // 單份耗材成本（銷貨成本用）
  },
  { timestamps: true }
)
ItemSchema.index({ name: 1 }, { unique: true })
export default mongoose.model('Item', ItemSchema)
