import express from 'express';
import Report from '../models/report.js';

const router = express.Router();
const norm = v => (v == null ? '' : String(v).trim());

router.get('/', async (req, res, next) => {
  try {
    const list = await Report.find().sort({ date: -1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.get('/:date', async (req, res, next) => {
  try {
    const date = decodeURIComponent(req.params.date);
    const doc = await Report.findOne({ date });
    res.json(doc || null); // 沒資料回 null
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const date = norm(req.body.date);
    if (!date) return res.status(400).json({ error: 'date required' });

    const payload = {
      items: Array.isArray(req.body.items) ? req.body.items.map(x => ({
        item: String(x.item || ''),
        qty: Number(x.qty || 0)
      })) : [],
      stallFee: Number(req.body.stallFee || 0),
      parkingFee: Number(req.body.parkingFee || 0),
      insuranceFee: Number(req.body.insuranceFee || 0),
      netProfit: Number(req.body.netProfit || 0)
    };

    const updated = await Report.findOneAndUpdate(
      { date },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:date', async (req, res, next) => {
  try {
    const date = decodeURIComponent(req.params.date);
    await Report.deleteOne({ date });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
