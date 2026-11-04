import fs from 'fs';
import path from 'path';
import { config } from '../config';

// All filesystem access for attachments goes through this small adapter so the
// backing store can be swapped later (SEC-09).
function uploadRoot(): string {
  return path.resolve(config.UPLOAD_DIR);
}

function resolveStoredPath(storedName: string): string {
  const safeName = path.basename(storedName);
  if (safeName !== storedName) {
    throw new Error('Invalid stored file name.');
  }
  return path.join(uploadRoot(), safeName);
}

async function save(storedName: string, data: Buffer): Promise<void> {
  await fs.promises.mkdir(uploadRoot(), { recursive: true });
  await fs.promises.writeFile(resolveStoredPath(storedName), data, { flag: 'wx' });
}

async function remove(storedName: string): Promise<void> {
  try {
    await fs.promises.unlink(resolveStoredPath(storedName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

async function exists(storedName: string): Promise<boolean> {
  try {
    await fs.promises.access(resolveStoredPath(storedName), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export const storageService = {
  save,
  remove,
  exists,
  resolveStoredPath,
};

export type StorageService = typeof storageService;
