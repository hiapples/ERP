import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    items: [
      {
        item: { type: String, required: true }, // 成品名稱（只有成品）
        qty: { type: Number, required: true }
      }
    ],

    // 四費用（保留請客費；相容舊欄位）
    stallFee: { type: Number, default: 0 },        // 攤販費
    parkingFee: { type: Number, default: 0 },      // 停車費
    treatFee: { type: Number, default: 0 },        // 請客費（原優待費）
    personnelFee: { type: Number, default: 0 },    // 人事費

    // 舊欄位相容（可能仍被舊前端/工具讀取）
    discountFee: { type: Number, default: 0 },
    preferentialFee: { type: Number, default: 0 },

    // 仍保留淨利欄位（若要匯出用）；實際回傳一律以即時計算為準
    netProfit: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'reports' }
)

export default mongoose.model('Report', ReportSchema)
