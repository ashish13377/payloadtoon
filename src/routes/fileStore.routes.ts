import { Router } from 'express';
import {
  getStatus,
  listSavedPayloads,
  savePayload,
  deleteSavedPayload,
} from '../controllers/fileStore.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/saved-payloads/status', asyncHandler(getStatus));
router.get('/saved-payloads', asyncHandler(listSavedPayloads));
router.post('/saved-payloads', asyncHandler(savePayload));
router.delete('/saved-payloads/:id', asyncHandler(deleteSavedPayload));

export default router;
