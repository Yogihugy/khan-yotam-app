import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { requireEnv } from './config.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()),
  }),
);
app.use(express.json());

app.use(healthRouter);
app.use('/auth', authRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

app.listen(port, () => {
  console.log(`Khan Yotam API listening on :${port}`);
});
