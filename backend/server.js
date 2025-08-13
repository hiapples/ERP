import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import In from './routes/in.js';
import Out from './routes/out.js';
import ReportRoutes from './routes/report.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 路由
app.use('/api/records', In);
app.use('/api/outrecords', Out);
app.use('/api/reports', ReportRoutes);

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mydb';

mongoose.set('strictQuery', true);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB 連線錯誤', err);
    process.exit(1);
  });

// 優雅關閉
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
  } finally {
    process.exit(0);
  }
});
