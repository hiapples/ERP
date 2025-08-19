import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },  // YYYY-MM-DD
  items: [{
    item: { type: String, required: true },             // 成品名
    qty:  { type: Number, required: true }
  }],
  fixedExpense: { type: Number, default: 0 },
  extraExpense: { type: Number, default: 0 },
  netProfit:    { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('Report', ReportSchema)
