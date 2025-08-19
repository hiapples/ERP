const express = require('express');
const router = express.Router();
const Item = require('../models/item');

const norm = v => (v == null ? '' : String(v).trim());

router.get('/', async (req, res, next) => {
  try {
    const list = await Item.find().sort({ type: 1, name: 1 });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = {
      name: norm(req.body.name),
      type: req.body.type || 'product', // 前端會帶 'raw' 或 'product'
      salePrice: Number(req.body.salePrice || 0)
    };
    if (!body.name || !body.type) return res.status(400).json({ error: 'name/type required' });
    const saved = await Item.create(body);
    res.json(saved);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const body = {
      name: norm(req.body.name),
      salePrice: Number(req.body.salePrice || 0)
    };
    const updated = await Item.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
