import mongoose from 'mongoose';
const { Schema } = mongoose;

// 品項（無綁定；成品多一個耗材成本）
const ItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['raw', 'product'], required: true },
  salePrice: { type: Number, default: 0 },      // 成品售價；原料可為 0
  consumableCost: { type: Number, default: 0 }  // 成品每份耗材成本（杯、瓶等）
}, { timestamps: true });

ItemSchema.index({ type: 1, name: 1 });

export default mongoose.model('Item', ItemSchema);
