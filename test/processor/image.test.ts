import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { convertImagesToWebp } from '../../src/processor/image.js';

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'pixcrush-image-'));
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

async function createSmallLowQualityJpeg(filePath: string) {
  const width = 128;
  const height = 128;
  const channels = 3;

  await sharp(randomBytes(width * height * channels), {
    raw: { width, height, channels },
  })
    .jpeg({ quality: 20 })
    .toFile(filePath);
}

describe('convertImagesToWebp', () => {
  it('converts multiple images with bounded concurrency', async () => {
    const dir = await createTempDir();
    const first = path.join(dir, 'first.jpg');
    const second = path.join(dir, 'second.jpg');
    await createPhotoLikeJpeg(first);
    await createPhotoLikeJpeg(second);

    const results = await convertImagesToWebp([first, second], 60, false, false, 2);

    expect(results.map((result) => result.status)).toEqual(['converted', 'converted']);
    await expect(fs.access(path.join(dir, 'first.webp'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(dir, 'second.webp'))).resolves.toBeUndefined();
  });

  it('skips an image when the WebP output would be larger', async () => {
    const dir = await createTempDir();
    const lowQualityJpeg = path.join(dir, 'low-quality.jpg');
    await createSmallLowQualityJpeg(lowQualityJpeg);

    const [result] = await convertImagesToWebp([lowQualityJpeg], 100, false, false, 1);

    expect(result.status).toBe('skipped-larger');
    await expect(fs.access(path.join(dir, 'low-quality.webp'))).rejects.toThrow();
  });

  it('skips existing WebP files unless overwrite is enabled', async () => {
    const dir = await createTempDir();
    const img = path.join(dir, 'photo.jpg');
    const webp = path.join(dir, 'photo.webp');
    await createPhotoLikeJpeg(img);
    await fs.writeFile(webp, 'existing');

    const [skipped] = await convertImagesToWebp([img], 60, false, false, 1);
    expect(skipped.status).toBe('skipped-existing');
    await expect(fs.readFile(webp, 'utf8')).resolves.toBe('existing');

    const [overwritten] = await convertImagesToWebp([img], 60, false, true, 1);
    expect(overwritten.status).toBe('converted');
    const overwrittenBuffer = await fs.readFile(webp);
    expect(overwrittenBuffer.equals(Buffer.from('existing'))).toBe(false);
    expect(overwrittenBuffer.subarray(0, 4).toString('utf8')).toBe('RIFF');
  });

  it('does not write output files during dry run', async () => {
    const dir = await createTempDir();
    const img = path.join(dir, 'photo.jpg');
    await createPhotoLikeJpeg(img);

    const [result] = await convertImagesToWebp([img], 60, true, false, 1);

    expect(result.status).toBe('converted');
    await expect(fs.access(path.join(dir, 'photo.webp'))).rejects.toThrow();
  });

  it('reports corrupt images without stopping the rest of the batch', async () => {
    const dir = await createTempDir();
    const good = path.join(dir, 'good.jpg');
    const bad = path.join(dir, 'bad.jpg');
    await createPhotoLikeJpeg(good);
    await fs.writeFile(bad, 'not an image');

    const results = await convertImagesToWebp([good, bad], 60, false, false, 2);

    expect(results.map((result) => result.status)).toEqual(['converted', 'failed']);
    expect(results[1].error).toBeTruthy();
  });
});
