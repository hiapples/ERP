// backend/routes/in.js
import express from 'express';
import mongoose from 'mongoose';
import InRecord from '../models/in.js';

const router = express.Router();

/**
 * GET /api/records
 * 可選 query：?date=YYYY-MM-DD&item=檸檬汁(或蘋果汁)
 */
router.get('/', async (req, res) => {
  try {
    const { date, item } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (item) filter.item = item;

    const docs = await InRecord.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('GET /records 失敗', err);
    res.status(500).json({ error: '取得入庫資料失敗' });
  }
});

/**
 * POST /api/records
 * 支援陣列或單筆物件
 * 欄位：item(必填)、quantity(>0)、price(>=0)、note(可空)、date(必填)
 */
router.post('/', async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    // 基本驗證
    const data = payload.map((r) => {
      const item = (r.item ?? '').toString().trim();
      const quantity = Number(r.quantity);
      const price = Number(r.price);
      const date = (r.date ?? '').toString().trim();
      const note = (r.note ?? '').toString();

      if (!item) throw new Error('item 必填');
      if (!date) throw new Error('date 必填');
      if (!(quantity > 0)) throw new Error('quantity 必須 > 0');
      if (!(price >= 0)) throw new Error('price 必須 >= 0');

      return { item, quantity, price, note, date };
    });

    const result = await InRecord.insertMany(data, { ordered: false });
    res.json({ inserted: result.length, ids: result.map((d) => d._id) });
  } catch (err) {
    console.error('POST /records 失敗', err);
    res.status(400).json({ error: err.message || '新增入庫資料失敗' });
  }
});

/**
 * PUT /api/records/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: '無效的 id' });

    const fields = {};
    if (typeof req.body.item === 'string') fields.item = req.body.item.trim();
    if (req.body.quantity != null) fields.quantity = Number(req.body.quantity);
    if (req.body.price != null) fields.price = Number(req.body.price);
    if (typeof req.body.note === 'string') fields.note = req.body.note;
    if (typeof req.body.date === 'string') fields.date = req.body.date.trim();

    const doc = await InRecord.findByIdAndUpdate(id, fields, { new: true });
    if (!doc) return res.status(404).json({ error: '找不到資料' });
    res.json(doc);
  } catch (err) {
    console.error('PUT /records/:id 失敗', err);
    res.status(400).json({ error: '更新失敗' });
  }
});

/**
 * DELETE /api/records/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: '無效的 id' });

    const r = await InRecord.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ error: '找不到資料' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /records/:id 失敗', err);
    res.status(400).json({ error: '刪除失敗' });
  }
});

export default router;
