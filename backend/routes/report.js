import express from 'express';
import Report from '../models/report.js';

const router = express.Router();

/**
 * 建立/更新單日報表（以 date 當 key）
 * 接收：
 * {
 *   date: 'YYYY-MM-DD',
 *   qtyCake: number,     // 檸檬汁份數
 *   qtyJuice: number,    // 蘋果汁份數
 *   fixedExpense: number,
 *   extraExpense: number,
 *   netProfit: number
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      date,
      qtyCake = 0,
      qtyJuice = 0,
      fixedExpense = 0,
      extraExpense = 0,
      netProfit = 0,
      items, // 兼容舊結構，可有可無
    } = req.body || {};

    if (!date) return res.status(400).json({ error: 'date 必填' });

    const payload = {
      date,
      qtyCake: Number(qtyCake) || 0,
      qtyJuice: Number(qtyJuice) || 0,
      fixedExpense: Number(fixedExpense) || 0,
      extraExpense: Number(extraExpense) || 0,
      netProfit: Number(netProfit) || 0,
    };

    if (Array.isArray(items)) payload.items = items;

    const doc = await Report.findOneAndUpdate(
      { date },
      { $set: payload },
      { new: true, upsert: true }
    );

    res.json(doc);
  } catch (err) {
    console.error(err);
    // 若 unique 衝突（同日同時寫），再試一次
    if (err?.code === 11000) {
      try {
        const { date } = req.body || {};
        const doc = await Report.findOne({ date });
        return res.json(doc);
      } catch (e2) {
        console.error(e2);
      }
    }
    res.status(500).json({ error: '建立/更新報表失敗' });
  }
});

// 取得所有報表（依日期 DESC）
router.get('/', async (_req, res) => {
  try {
    const list = await Report.find().sort({ date: -1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取得報表清單失敗' });
  }
});

// 取得單日報表
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const doc = await Report.findOne({ date });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取得報表失敗' });
  }
});

// 刪除單日報表（清除當天的所有報表資料）
router.delete('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const ret = await Report.deleteMany({ date });
    res.json({ ok: true, deleted: ret.deletedCount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除報表失敗' });
  }
});

export default router;
