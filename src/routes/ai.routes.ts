import { Router } from 'express';
import { analyzeData } from '../controllers/ai.controller';
import { compressPayload } from '../middleware/toon.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/analyze', asyncHandler(compressPayload), asyncHandler(analyzeData));

export default router;
