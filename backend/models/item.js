// backend/models/item.js (ESM)
import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['raw', 'product'],
      required: true,
    },
    // 成品售價；原料可維持 0
    salePrice: {
      type: Number,
      default: 0,
      min: [0, 'salePrice must be >= 0'],
    },
    // 成品耗材成本；原料預設 0
    consumableCost: {
      type: Number,
      default: 0,
      min: [0, 'consumableCost must be >= 0'],
      // 若是成品，仍允許 0（有些產品可能沒有額外耗材）
      validate: {
        validator(v) {
          return v >= 0
        },
        message: 'consumableCost must be >= 0',
      },
    },
  },
  {
    timestamps: true,
    collection: 'items',
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id
        delete ret._id
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id
        delete ret._id
      },
    },
  }
)

// 正規化名稱（避免「  糖  」與「糖」判為不同）
ItemSchema.pre('save', function normalizeName(next) {
  if (typeof this.name === 'string') {
    this.name = this.name.trim()
  }
  next()
})

/**
 * 唯一索引：同一 type 下 name 不可重複（大小寫不敏感）
 * 提示：MongoDB 需 3.4+；資料庫/集合若已有其他 collation，這裡 index-level collation 會套在此索引。
 */
ItemSchema.index(
  { name: 1, type: 1 },
  {
    unique: true,
    collation: { locale: 'zh', strength: 2 }, // strength:2 => case-insensitive
    name: 'uniq_name_type_ci',
  }
)

// 常用查詢：依新增順序（createdAt）由舊到新 / 由新到舊
ItemSchema.statics.findAllByCreatedAsc = function () {
  return this.find().sort({ createdAt: 1, _id: 1 }).lean()
}
ItemSchema.statics.findAllByCreatedDesc = function () {
  return this.find().sort({ createdAt: -1, _id: -1 }).lean()
}

export default mongoose.model('Item', ItemSchema)
