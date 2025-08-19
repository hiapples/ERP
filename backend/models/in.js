const mongoose = require('mongoose');
const { Schema } = mongoose;

// 入庫（原料進貨）
const InSchema = new Schema({
  item: { type: String, required: true, trim: true }, // 原料名
  quantity: { type: Number, required: true, min: 0 }, // g
  price: { type: Number, required: true, min: 0 },    // 整筆價格
  note: { type: String, default: '' },
  date: { type: String, required: true }              // YYYY-MM-DD
}, { timestamps: true });

InSchema.index({ date: 1, item: 1 });

module.exports = mongoose.model('Record', InSchema);
