import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // 一天一筆（若你想允許同日複數筆，把 unique 拿掉即可）
    date: { type: String, required: true, unique: true },

    // 你前端目前仍用 qtyCake / qtyJuice 兩個欄位來代表兩品項
    // 這裡沿用命名（只是顯示名稱改成檸檬汁 / 蘋果汁）
    qtyCake: { type: Number, default: 0 },     // 檸檬汁 份數
    qtyJuice: { type: Number, default: 0 },    // 蘋果汁 份數

    fixedExpense: { type: Number, default: 0 }, // 固定支出
    extraExpense: { type: Number, default: 0 }, // 額外支出
    netProfit: { type: Number, default: 0 },    // 淨利（可存前端計算結果）

    // 可選：保留 items 結構，兼容舊資料
    items: [
      {
        name: { type: String },
        qty: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
