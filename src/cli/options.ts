import { DEFAULT_OPTIONS } from '../config.js';
import { CrushOptions } from '../types.js';

export interface RawCliOptions {
  quality?: string;
  concurrency?: string;
  overwrite?: boolean;
}

export interface PromptedCliOptions {
  dryRun: boolean;
  deleteOriginals: boolean;
}

export function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  optionName: string,
) {
  if (value === undefined) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive number.`);
  }

  return parsed;
}

export function parseQuality(value: string | undefined) {
  const quality = parsePositiveInteger(value, DEFAULT_OPTIONS.quality, '--quality');
  if (quality > 100) {
    throw new Error('--quality must be between 1 and 100.');
  }

  return quality;
}

export function resolveCliOptions(
  rawOptions: RawCliOptions,
  promptedOptions: PromptedCliOptions,
): CrushOptions {
  return {
    dryRun: promptedOptions.dryRun,
    quality: parseQuality(rawOptions.quality),
    deleteOriginals: promptedOptions.deleteOriginals,
    concurrency: parsePositiveInteger(
      rawOptions.concurrency,
      DEFAULT_OPTIONS.concurrency,
      '--concurrency',
    ),
    overwrite: rawOptions.overwrite ?? DEFAULT_OPTIONS.overwrite,
  };
}
