import mongoose from 'mongoose';
const { Schema } = mongoose;

// 品項：原料 or 成品（只有名稱、售價）
const ItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['raw', 'product'], required: true },
  salePrice: { type: Number, default: 0 }
}, { timestamps: true });

ItemSchema.index({ type: 1, name: 1 });

export default mongoose.model('Item', ItemSchema);
