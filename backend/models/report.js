import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    qtyCake: { type: Number, default: 0 },
    qtyJuice: { type: Number, default: 0 },
    fixedExpense: { type: Number, default: 0 },
    extraExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Report', ReportSchema)
