// backend/models/Item.js
import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },  // 例：檸檬汁
    salePrice: { type: Number, default: 0 }                // 報表單價
  },
  { timestamps: true }
)

export default mongoose.model('Item', ItemSchema)
