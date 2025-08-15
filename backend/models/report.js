import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  qtyCake: { type: Number, required: true, default: 0 },
  qtyJuice: { type: Number, required: true, default: 0 },
  fixedExpense: { type: Number, required: true, default: 0 },
  extraExpense: { type: Number, required: true, default: 0 },
  netProfit: { type: Number, required: true, default: 0 }
}, { timestamps: true })

export default mongoose.model('Report', reportSchema)
