import mongoose from 'mongoose';
const { Schema } = mongoose;

// 每日報表（只存成品份數與三費用；成本由原料出庫加總 + 份數×耗材(前端算或自取)）
const ReportSchema = new Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  items: [{
    item: { type: String, required: true }, // 成品名
    qty: { type: Number, required: true, min: 0 }
  }],
  stallFee: { type: Number, default: 0 },
  parkingFee: { type: Number, default: 0 },
  insuranceFee: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 }
}, { timestamps: true });

ReportSchema.index({ date: 1 });

export default mongoose.model('Report', ReportSchema);
