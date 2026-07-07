export interface ScanResult {
  imageFiles: string[];
  codeFiles: string[];
}

export interface CrushOptions {
  dryRun: boolean;
  quality: number;
  deleteOriginals: boolean;
  concurrency: number;
  overwrite: boolean;
}

export type ConversionStatus = 'converted' | 'skipped-larger' | 'skipped-existing' | 'failed';

export interface ConversionResult {
  originalPath: string;
  newPath: string;
  originalSize: number;
  newSize: number;
  status: ConversionStatus;
  error?: string;
}

export interface ConversionSummary {
  converted: ConversionResult[];
  skippedLarger: ConversionResult[];
  skippedExisting: ConversionResult[];
  failed: ConversionResult[];
}

export interface RunSummaryInput {
  totalImages: number;
  usedImages: number;
  conversionSummary: ConversionSummary;
  codeFilesUpdated: number;
  concurrency: number;
  convertedOriginalsDeleted: number;
  unusedImagesDeleted: number;
}

export interface RunSummary {
  totalImages: number;
  usedImages: number;
  convertedImages: number;
  skippedLargerImages: number;
  skippedExistingImages: number;
  failedConversions: number;
  spaceSavedBytes: number;
  codeFilesUpdated: number;
  concurrency: number;
  convertedOriginalsDeleted: number;
  unusedImagesDeleted: number;
}

export interface TrackerResult {
  usedImages: string[];
  unusedImages: string[];
  warnings: string[];
  parseFailureFiles: string[];
}

export interface CodeUpdateResult {
  updatedFilesCount: number;
  parseFailureFiles: string[];
}
