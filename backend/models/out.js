import mongoose from 'mongoose';

const outRecordSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },   // 品項（檸檬汁 / 蘋果汁）
    quantity: { type: Number, required: true, min: 0 },   // 出庫數量
    price: { type: Number, required: true, min: 0 },      // 單價（用來算成本）
    note: { type: String, default: '' },                  // 備註（選填）
    date: { type: String, required: true },               // yyyy-mm-dd
  },
  { timestamps: true }
);

export default mongoose.model('OutRecord', outRecordSchema);
