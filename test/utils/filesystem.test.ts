import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileExists, writeFileAtomically } from '../../src/utils/filesystem.js';

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'pixcrush-filesystem-'));
}

describe('filesystem helpers', () => {
  it('detects whether a file exists', async () => {
    const dir = await createTempDir();
    const existingFile = path.join(dir, 'existing.txt');
    const missingFile = path.join(dir, 'missing.txt');
    await fs.writeFile(existingFile, 'hello');

    await expect(fileExists(existingFile)).resolves.toBe(true);
    await expect(fileExists(missingFile)).resolves.toBe(false);
  });

  it('writes files atomically to the requested path', async () => {
    const dir = await createTempDir();
    const file = path.join(dir, 'output.webp');

    await writeFileAtomically(file, Buffer.from('webp-output'));

    await expect(fs.readFile(file, 'utf8')).resolves.toBe('webp-output');
  });
});
