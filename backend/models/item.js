// models/Item.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  salePrice: { type: Number, default: 0 },         // 原料可忽略，成品會用到
  type: { type: String, enum: ['raw', 'product'], required: true },
  bindRaw: { type: String, default: '' },          // ★ 新增：成品綁定的原料名稱
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
