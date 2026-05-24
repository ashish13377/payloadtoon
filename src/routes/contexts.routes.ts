import { Router } from 'express';
import { analyzeStoredContext, createContext, deleteContext } from '../controllers/contexts.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/contexts', asyncHandler(createContext));
router.post('/contexts/:contextId/analyze', asyncHandler(analyzeStoredContext));
router.delete('/contexts/:contextId', asyncHandler(deleteContext));

export default router;
