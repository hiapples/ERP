import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    qtyCake: { type: Number, default: 0 },   // 檸檬汁份數
    qtyJuice: { type: Number, default: 0 },  // 蘋果汁份數
    fixedExpense: { type: Number, default: 0 },
    extraExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }
  },
  { timestamps: true }
)

export default mongoose.model('Report', ReportSchema)
