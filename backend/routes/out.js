// backend/routes/out.js
import express from 'express';
import mongoose from 'mongoose';
import OutRecord from '../models/out.js';

const router = express.Router();

// 兩個品項分組（對應你的前端：檸檬汁、蘋果汁）
const GROUP_1 = ['檸檬汁']; // totalGroup1
const GROUP_2 = ['蘋果汁']; // totalGroup2

/**
 * GET /api/outrecords
 * 可選 query：?date=YYYY-MM-DD&item=檸檬汁(或蘋果汁)
 */
router.get('/', async (req, res) => {
  try {
    const { date, item } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (item) filter.item = item;

    const docs = await OutRecord.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('GET /outrecords 失敗', err);
    res.status(500).json({ error: '取得出庫資料失敗' });
  }
});

/**
 * POST /api/outrecords
 * 支援陣列或單筆物件
 * 欄位：item(必填)、quantity(>0)、price(>=0)、note(可空)、date(必填)
 */
router.post('/', async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

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

    const result = await OutRecord.insertMany(data, { ordered: false });
    res.json({ inserted: result.length, ids: result.map((d) => d._id) });
  } catch (err) {
    console.error('POST /outrecords 失敗', err);
    res.status(400).json({ error: err.message || '新增出庫資料失敗' });
  }
});

/**
 * PUT /api/outrecords/:id
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

    const doc = await OutRecord.findByIdAndUpdate(id, fields, { new: true });
    if (!doc) return res.status(404).json({ error: '找不到資料' });
    res.json(doc);
  } catch (err) {
    console.error('PUT /outrecords/:id 失敗', err);
    res.status(400).json({ error: '更新失敗' });
  }
});

/**
 * DELETE /api/outrecords/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: '無效的 id' });

    const r = await OutRecord.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ error: '找不到資料' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /outrecords/:id 失敗', err);
    res.status(400).json({ error: '刪除失敗' });
  }
});

/**
 * GET /api/outrecords/total/:date
 * 計算當天兩個分組（檸檬汁/蘋果汁）的總成本（∑ 數量*單價）
 * 回傳：{ totalGroup1, totalGroup2 }
 */
router.get('/total/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) return res.status(400).json({ error: 'date 必填' });

    // 先把同一天每個 item 的金額加總
    const agg = await OutRecord.aggregate([
      { $match: { date } },
      { $group: { _id: '$item', total: { $sum: { $multiply: ['$quantity', '$price'] } } } },
    ]);

    const byItem = Object.fromEntries(agg.map(a => [a._id, a.total || 0]));

    const sumGroup = (list) => list.reduce((s, it) => s + (Number(byItem[it]) || 0), 0);

    const totalGroup1 = sumGroup(GROUP_1); // 檸檬汁
    const totalGroup2 = sumGroup(GROUP_2); // 蘋果汁

    res.json({
      totalGroup1: Number(totalGroup1.toFixed(2)),
      totalGroup2: Number(totalGroup2.toFixed(2)),
    });
  } catch (err) {
    console.error('GET /outrecords/total/:date 失敗', err);
    res.status(500).json({ error: '計算成本失敗' });
  }
});

export default router;
