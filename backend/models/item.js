// backend/models/item.js  ← 確認路徑與檔名大小寫
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['raw', 'product'], required: true },
    salePrice: { type: Number, default: 0 },   // 成品會用到；原料可為 0
    bindRaw: { type: String, default: '' },    // 成品綁定的原料名稱（沒綁就空字串）
  },
  { timestamps: true }
);

const Item = mongoose.model('Item', ItemSchema);

// ★ 同時提供 default 與 named 匯出，兩種 import 都可用
export default Item;
export { Item };
