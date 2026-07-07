import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { ConversionResult } from '../types.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { fileExists, writeFileAtomically } from '../utils/filesystem.js';

async function convertImageToWebp(
  imgPath: string,
  quality: number,
  dryRun: boolean,
  overwrite: boolean,
): Promise<ConversionResult> {
  const parsed = path.parse(imgPath);
  const newPath = path.join(parsed.dir, `${parsed.name}.webp`);

  try {
    const stat = await fs.stat(imgPath);
    const originalSize = stat.size;

    if (!overwrite && (await fileExists(newPath))) {
      return {
        originalPath: imgPath,
        newPath,
        originalSize,
        newSize: 0,
        status: 'skipped-existing',
      };
    }

    // Do Sharp processing in-memory to check size before writing
    const webpBuffer = await sharp(imgPath).webp({ quality }).toBuffer();
    const newSize = webpBuffer.length;

    if (newSize >= originalSize) {
      return {
        originalPath: imgPath,
        newPath,
        originalSize,
        newSize,
        status: 'skipped-larger',
      };
    }

    if (!dryRun) {
      await writeFileAtomically(newPath, webpBuffer);
    }

    return {
      originalPath: imgPath,
      newPath,
      originalSize,
      newSize,
      status: 'converted',
    };
  } catch (error: unknown) {
    return {
      originalPath: imgPath,
      newPath,
      originalSize: 0,
      newSize: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function convertImagesToWebp(
  images: string[],
  quality: number,
  dryRun: boolean,
  overwrite: boolean,
  concurrency: number,
): Promise<ConversionResult[]> {
  return mapWithConcurrency(images, concurrency, (imgPath) =>
    convertImageToWebp(imgPath, quality, dryRun, overwrite),
  );
}
