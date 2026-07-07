import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { runCrush } from '../src/index.js';

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'pixcrush-pipeline-'));
}

async function createPhotoLikeJpeg(filePath: string) {
  const width = 128;
  const height = 128;
  const channels = 3;

  await sharp(randomBytes(width * height * channels), {
    raw: { width, height, channels },
  })
    .jpeg({ quality: 95 })
    .toFile(filePath);
}

describe('runCrush', () => {
  it('converts used images, updates references, and safely deletes originals', async () => {
    const dir = await createTempDir();
    const publicDir = path.join(dir, 'public');
    await fs.mkdir(publicDir);

    const usedImage = path.join(publicDir, 'hero.jpg');
    const unusedImage = path.join(publicDir, 'unused.jpg');
    const sourceFile = path.join(dir, 'index.tsx');

    await createPhotoLikeJpeg(usedImage);
    await createPhotoLikeJpeg(unusedImage);
    await fs.writeFile(sourceFile, 'export const hero = "/hero.jpg";');

    await runCrush(dir, {
      dryRun: false,
      quality: 60,
      deleteOriginals: true,
      concurrency: 2,
      overwrite: false,
    });

    await expect(fs.access(path.join(publicDir, 'hero.webp'))).resolves.toBeUndefined();
    await expect(fs.access(usedImage)).rejects.toThrow();
    await expect(fs.access(unusedImage)).rejects.toThrow();
    await expect(fs.readFile(sourceFile, 'utf8')).resolves.toContain('/hero.webp');
  });
});
