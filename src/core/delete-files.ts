import * as p from '@clack/prompts';
import fs from 'fs/promises';
import { mapWithConcurrency } from '../utils/concurrency.js';

export async function deleteFiles(filePaths: string[], concurrency: number) {
  const results = await mapWithConcurrency(filePaths, concurrency, async (filePath) => {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      p.log.warn(`Failed to delete file ${filePath}: ${message}`);
      return false;
    }
  });

  return results.filter(Boolean).length;
}
