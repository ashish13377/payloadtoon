import { Router } from 'express';
import { getLedger } from '../controllers/analytics.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/analytics/ledger', asyncHandler(getLedger));

export default router;
