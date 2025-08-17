import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  salePrice: { type: Number, default: 0 },
  type: { type: String, enum: ['raw', 'product'], default: 'raw' }, // ✅ 新增
}, { timestamps: true })

export default mongoose.model('Item', ItemSchema)
