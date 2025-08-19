const express = require('express');
const router = express.Router();
const Record = require('../models/in.js');

const norm = v => (v == null ? '' : String(v).trim());

router.get('/', async (req, res, next) => {
  try {
    const q = {};
    if (norm(req.query.date)) q.date = norm(req.query.date);
    if (norm(req.query.item)) q.item = norm(req.query.item);
    const list = await Record.find(q).sort({ date: -1, createdAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = {
      item: norm(req.body.item),
      quantity: Number(req.body.quantity || 0),
      price: Number(req.body.price || 0),
      note: norm(req.body.note || ''),
      date: norm(req.body.date)
    };
    if (!doc.item || !doc.date) return res.status(400).json({ error: 'item/date required' });
    const saved = await Record.create(doc);
    res.json(saved);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = {
      item: norm(req.body.item),
      quantity: Number(req.body.quantity || 0),
      price: Number(req.body.price || 0),
      note: norm(req.body.note || ''),
      date: norm(req.body.date)
    };
    const updated = await Record.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
