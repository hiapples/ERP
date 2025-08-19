import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  salePrice: { type: Number, default: 0 },
  type: { type: String, enum: ['raw', 'product'], required: true },
  // product only
  bindRaw: { type: String, default: '' },
  bindRaw2: { type: String, default: '' },      // 第二原料
  bindRatio2: { type: Number, default: 0 },     // 0~1，第二原料比例
  consumableCost: { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('Item', ItemSchema)
