import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    salePrice: { type: Number, default: 0 },           // 成品售價；原料可為 0
    type: { type: String, enum: ['raw', 'product'], required: true },
    consumableCost: { type: Number, default: 0 }       // 成品耗材；原料預設 0
  },
  { timestamps: true, collection: 'items' }
)

ItemSchema.index({ name: 1, type: 1 }, { unique: true })

export default mongoose.model('Item', ItemSchema)
