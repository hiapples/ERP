// backend/models/report.js
import mongoose from 'mongoose'

const ReportItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty:  { type: Number, required: true, default: 0 }
}, { _id: false })

const ReportSchema = new mongoose.Schema({
  date:          { type: String, required: true, index: true, unique: true },
  items:         { type: [ReportItemSchema], default: [] },
  stallFee:      { type: Number, default: 0 }, // 攤販費
  parkingFee:    { type: Number, default: 0 }, // 停車費
  insuranceFee:  { type: Number, default: 0 }, // 保險費
  netProfit:     { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('Report', ReportSchema)
