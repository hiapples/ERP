import mongoose from 'mongoose';
const { Schema } = mongoose;

// 出庫（以原料扣庫）
const OutSchema = new Schema({
  item: { type: String, required: true, trim: true }, // 原料名
  quantity: { type: Number, required: true, min: 0 }, // g
  price: { type: Number, required: true, min: 0 },    // 成本 = 平均單價 × 扣除量
  note: { type: String, default: '' },
  date: { type: String, required: true }              // YYYY-MM-DD
}, { timestamps: true });

OutSchema.index({ date: 1, item: 1 });

export default mongoose.model('OutRecord', OutSchema);
