import { Router } from 'express';
import { compressOnly } from '../controllers/toon.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/toon/compress', asyncHandler(compressOnly));

export default router;
