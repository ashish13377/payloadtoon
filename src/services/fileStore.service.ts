import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import type { SavedPayload } from '../types/api.types';

class MemorySavedPayloadStore {
  private readonly store = new Map<string, SavedPayload>();

  set(payload: SavedPayload): void {
    this.store.set(payload.id, payload);
  }

  get(id: string): SavedPayload | null {
    return this.store.get(id) ?? null;
  }

  list(): SavedPayload[] {
    return Array.from(this.store.values());
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}

export class FileStoreService {
  private readonly memoryStore = new MemorySavedPayloadStore();

  private get storePath(): string {
    return path.resolve(env.FILE_STORE_PATH);
  }

  public isEnabled(): boolean {
    return env.FILE_STORE_ENABLED;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isEnabled()) return;

    const dir = path.dirname(this.storePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore if directory exists
    }

    try {
      await fs.access(this.storePath);
    } catch {
      // Create empty JSON array file if it doesn't exist
      await fs.writeFile(this.storePath, JSON.stringify([]), 'utf-8');
    }
  }

  public async list(): Promise<SavedPayload[]> {
    if (!this.isEnabled()) {
      return this.memoryStore.list();
    }

    try {
      await this.ensureInitialized();
      const content = await fs.readFile(this.storePath, 'utf-8');
      const filePayloads = JSON.parse(content) as SavedPayload[];
      
      this.memoryStore.clear();
      for (const p of filePayloads) {
        this.memoryStore.set(p);
      }
      return filePayloads;
    } catch (error) {
      console.error('[FileStoreService] Error listing saved payloads:', error);
      return this.memoryStore.list();
    }
  }

  public async save(
    name: string,
    userQuery: string,
    documentContext: Record<string, unknown>[],
  ): Promise<SavedPayload> {
    const newPayload: SavedPayload = {
      id: `pl_${randomUUID().replace(/-/g, '')}`,
      name: name.trim() || `Saved Payload ${new Date().toLocaleString()}`,
      userQuery,
      documentContext,
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.set(newPayload);

    if (this.isEnabled()) {
      try {
        await this.ensureInitialized();
        const payloads = this.memoryStore.list();
        await fs.writeFile(this.storePath, JSON.stringify(payloads, null, 2), 'utf-8');
      } catch (error) {
        console.error('[FileStoreService] Error saving payload to file:', error);
      }
    }

    return newPayload;
  }

  public async delete(id: string): Promise<boolean> {
    const deletedFromMemory = this.memoryStore.delete(id);

    if (this.isEnabled()) {
      try {
        await this.ensureInitialized();
        const payloads = this.memoryStore.list();
        await fs.writeFile(this.storePath, JSON.stringify(payloads, null, 2), 'utf-8');
      } catch (error) {
        console.error('[FileStoreService] Error deleting payload from file:', error);
      }
    }

    return deletedFromMemory;
  }
}

export const fileStoreService = new FileStoreService();
