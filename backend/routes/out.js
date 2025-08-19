import express from 'express';
import OutRecord from '../models/out.js';

const router = express.Router();
const norm = v => (v == null ? '' : String(v).trim());

// 查詢（date / item）
router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (norm(req.query.date)) q.date = norm(req.query.date);
    if (norm(req.query.item)) q.item = norm(req.query.item);
    const list = await OutRecord.find(q).sort({ date: -1, createdAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
});

// 新增
router.post('/', async (req, res, next) => {
  try {
    const doc = {
      item: norm(req.body.item),                  // 原料名
      quantity: Number(req.body.quantity || 0),   // g
      price: Number(req.body.price || 0),
      note: norm(req.body.note || ''),
      date: norm(req.body.date)
    };
    if (!doc.item || !doc.date) return res.status(400).json({ error: 'item/date required' });
    const saved = await OutRecord.create(doc);
    res.json(saved);
  } catch (e) { next(e); }
});

// 更新
router.put('/:id', async (req, res, next) => {
  try {
    const body = {
      item: norm(req.body.item),
      quantity: Number(req.body.quantity || 0),
      price: Number(req.body.price || 0),
      note: norm(req.body.note || ''),
      date: norm(req.body.date)
    };
    const updated = await OutRecord.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
});

// 刪除
router.delete('/:id', async (req, res, next) => {
  try {
    await OutRecord.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// （可選）回傳指定日期的原料成本總覽
router.get('/total/:date', async (req, res, next) => {
  try {
    const date = norm(req.params.date);
    const docs = await OutRecord.find({ date });

    let total = 0;
    const byRaw = {}; // key: 原料名, val: 成本加總

    for (const d of docs) {
      const price = Number(d.price || 0);
      total += price;
      const raw = norm(d.item);
      if (!raw) continue;
      byRaw[raw] = (byRaw[raw] || 0) + price;
    }

    res.json({ date, total, byRaw });
  } catch (e) { next(e); }
});

export default router;
