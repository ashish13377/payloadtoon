import type { Request, Response } from 'express';
import { z } from 'zod';
import { fileStoreService } from '../services/fileStore.service';
import { HttpError } from '../utils/httpError';
import type {
  GetSavedPayloadsResponse,
  SavePayloadResponse,
  DeleteSavedPayloadResponse,
  SavedPayloadsStatusResponse,
} from '../types/api.types';

const SavePayloadRequestSchema = z.object({
  name: z.string().trim().max(100).optional(),
  userQuery: z.string().trim().min(1, 'userQuery is required').max(5_000),
  documentContext: z.array(z.record(z.string(), z.unknown())).min(1, 'documentContext must contain at least one object').max(10_000),
});

export async function getStatus(req: Request, res: Response<SavedPayloadsStatusResponse>): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      enabled: fileStoreService.isEnabled(),
    },
  });
}

export async function listSavedPayloads(req: Request, res: Response<GetSavedPayloadsResponse>): Promise<void> {
  const data = await fileStoreService.list();
  res.status(200).json({
    success: true,
    data,
  });
}

export async function savePayload(req: Request, res: Response<SavePayloadResponse>): Promise<void> {
  const parsed = SavePayloadRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid save payload request body.', parsed.error.flatten());
  }

  const { name, userQuery, documentContext } = parsed.data;
  const saved = await fileStoreService.save(
    name ?? '',
    userQuery,
    documentContext,
  );

  res.status(201).json({
    success: true,
    data: saved,
  });
}

export async function deleteSavedPayload(req: Request, res: Response<DeleteSavedPayloadResponse>): Promise<void> {
  const id = req.params.id as string;
  if (!id) {
    throw new HttpError(400, 'Missing saved payload ID.');
  }

  const deleted = await fileStoreService.delete(id);
  if (!deleted) {
    throw new HttpError(404, `Saved payload with ID "${id}" was not found.`);
  }

  res.status(200).json({
    success: true,
    data: {
      id,
      deleted: true,
    },
  });
}
