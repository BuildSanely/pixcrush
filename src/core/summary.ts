import { ConversionResult, ConversionSummary, RunSummary, RunSummaryInput } from '../types.js';

export function summarizeConversions(conversions: ConversionResult[]): ConversionSummary {
  return {
    converted: conversions.filter((conversion) => conversion.status === 'converted'),
    skippedLarger: conversions.filter((conversion) => conversion.status === 'skipped-larger'),
    skippedExisting: conversions.filter((conversion) => conversion.status === 'skipped-existing'),
    failed: conversions.filter((conversion) => conversion.status === 'failed'),
  };
}

export function calculateSpaceSavedBytes(conversions: ConversionResult[]) {
  return conversions.reduce(
    (total, conversion) => total + (conversion.originalSize - conversion.newSize),
    0,
  );
}

export function buildRunSummary(input: RunSummaryInput): RunSummary {
  return {
    totalImages: input.totalImages,
    usedImages: input.usedImages,
    convertedImages: input.conversionSummary.converted.length,
    skippedLargerImages: input.conversionSummary.skippedLarger.length,
    skippedExistingImages: input.conversionSummary.skippedExisting.length,
    failedConversions: input.conversionSummary.failed.length,
    spaceSavedBytes: calculateSpaceSavedBytes(input.conversionSummary.converted),
    codeFilesUpdated: input.codeFilesUpdated,
    concurrency: input.concurrency,
    convertedOriginalsDeleted: input.convertedOriginalsDeleted,
    unusedImagesDeleted: input.unusedImagesDeleted,
  };
}

export function formatMegabytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2);
}
