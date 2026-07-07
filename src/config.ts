import { CrushOptions } from './types.js';
import os from 'os';

export const DEFAULT_CONCURRENCY = Math.min(
  4,
  Math.max(1, Math.floor((os.availableParallelism?.() ?? os.cpus().length) / 2)),
);

export const DEFAULT_OPTIONS: CrushOptions = {
  dryRun: false,
  quality: 80,
  deleteOriginals: false,
  concurrency: DEFAULT_CONCURRENCY,
  overwrite: false,
};
