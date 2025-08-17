// routes/items.js
const express = require('express');
const router = express.Router();
const Item = require('../models/item');

// 取得全部品項
router.get('/items', async (req, res) => {
  const list = await Item.find().lean();
  res.json(list);
});

// 新增品項
router.post('/items', async (req, res) => {
  const { name, salePrice = 0, type, bindRaw = '' } = req.body;
  if (!name || !type) return res.status(400).json({ message: 'name & type required' });

  const payload = { name: name.trim(), type };
  if (type === 'product') {
    payload.salePrice = Number(salePrice || 0);
    payload.bindRaw = bindRaw || '';
  }
  // 原料不需要售價與綁定
  const doc = await Item.create(payload);
  res.json(doc);
});

// 更新品項
router.put('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, salePrice, bindRaw } = req.body;

  const doc = await Item.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });

  if (name !== undefined) doc.name = name;
  if (doc.type === 'product') {
    if (salePrice !== undefined) doc.salePrice = Number(salePrice || 0);
    if (bindRaw !== undefined) doc.bindRaw = bindRaw || '';
  } else {
    // 保險：原料沒有綁定
    doc.bindRaw = '';
    doc.salePrice = 0;
  }

  await doc.save();
  res.json(doc);
});

// 刪除品項
router.delete('/items/:id', async (req, res) => {
  const { id } = req.params;
  await Item.findByIdAndDelete(id);
  res.json({ ok: true });
});

module.exports = router;
