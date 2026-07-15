import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'khan-yotam-api',
    ts: new Date().toISOString(),
  });
});
