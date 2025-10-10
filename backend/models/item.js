import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['product'], default: 'product', index: true },
    salePrice: { type: Number, default: 0 },       // 售價（用於營收）
    consumableCost: { type: Number, default: 0 }   // 每份耗材成本（用於成本）
  },
  { timestamps: true }
)

ItemSchema.index({ name: 1 }, { unique: true })

export default mongoose.model('Item', ItemSchema)
