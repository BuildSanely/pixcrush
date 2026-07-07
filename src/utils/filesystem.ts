import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeFileAtomically(filePath: string, buffer: Buffer) {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Best effort cleanup only.
    }
    throw error;
  }
}
