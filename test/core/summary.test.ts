import { describe, expect, it } from 'vitest';
import { ConversionResult } from '../../src/types.js';
import {
  buildRunSummary,
  calculateSpaceSavedBytes,
  formatMegabytes,
  summarizeConversions,
} from '../../src/core/summary.js';

const conversions: ConversionResult[] = [
  {
    originalPath: '/project/public/hero.jpg',
    newPath: '/project/public/hero.webp',
    originalSize: 1_000,
    newSize: 400,
    status: 'converted',
  },
  {
    originalPath: '/project/public/logo.png',
    newPath: '/project/public/logo.webp',
    originalSize: 500,
    newSize: 600,
    status: 'skipped-larger',
  },
  {
    originalPath: '/project/public/existing.jpg',
    newPath: '/project/public/existing.webp',
    originalSize: 700,
    newSize: 0,
    status: 'skipped-existing',
  },
  {
    originalPath: '/project/public/broken.jpg',
    newPath: '/project/public/broken.webp',
    originalSize: 0,
    newSize: 0,
    status: 'failed',
    error: 'Input file contains unsupported image format',
  },
];

describe('summary helpers', () => {
  it('groups conversion results by status', () => {
    const summary = summarizeConversions(conversions);

    expect(summary.converted).toHaveLength(1);
    expect(summary.skippedLarger).toHaveLength(1);
    expect(summary.skippedExisting).toHaveLength(1);
    expect(summary.failed).toHaveLength(1);
  });

  it('calculates space saved from converted images', () => {
    expect(calculateSpaceSavedBytes([conversions[0]])).toBe(600);
    expect(formatMegabytes(600)).toBe('0.00');
  });

  it('builds a run summary without terminal/reporting side effects', () => {
    const conversionSummary = summarizeConversions(conversions);

    expect(
      buildRunSummary({
        totalImages: 10,
        usedImages: 4,
        conversionSummary,
        codeFilesUpdated: 2,
        concurrency: 3,
        convertedOriginalsDeleted: 1,
        unusedImagesDeleted: 6,
      }),
    ).toEqual({
      totalImages: 10,
      usedImages: 4,
      convertedImages: 1,
      skippedLargerImages: 1,
      skippedExistingImages: 1,
      failedConversions: 1,
      spaceSavedBytes: 600,
      codeFilesUpdated: 2,
      concurrency: 3,
      convertedOriginalsDeleted: 1,
      unusedImagesDeleted: 6,
    });
  });
});
