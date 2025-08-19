const mongoose = require('mongoose');
const { Schema } = mongoose;

// 品項：原料 or 成品（只有名稱、售價；無綁定、無耗材）
const ItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['raw', 'product'], required: true },
  salePrice: { type: Number, default: 0 }
}, { timestamps: true });

ItemSchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('Item', ItemSchema);
