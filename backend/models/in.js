import mongoose from 'mongoose';

const inRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },   // 品項（你現在用：檸檬汁 / 蘋果汁）
    quantity: { type: Number, required: true, min: 0 },   // 入庫數量
    price: { type: Number, required: true, min: 0 },      // 單價（進貨成本或平均價）
    note: { type: String, default: '' },                  // 備註（選填）
    date: { type: String, required: true },               // yyyy-mm-dd
  },
  { timestamps: true }
);

export default mongoose.model('InRecord', inRecordSchema);
