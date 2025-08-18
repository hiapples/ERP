// backend/models/item.js
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['raw', 'product'], required: true },
    salePrice: { type: Number, default: 0 },
    bindRaw: { type: String, default: '' },
    // ★ 新增：成品每一份的耗材成本（報表會用 份數 × 此單價 加總到「銷貨成本」）
    consumableCost: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Item = mongoose.model('Item', ItemSchema);
export default Item;
export { Item };
