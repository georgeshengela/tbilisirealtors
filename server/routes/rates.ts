import { Router } from 'express';
import { getRates } from '../services/currency.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(await getRates());
});

export default router;
