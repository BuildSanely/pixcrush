import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../../src/config.js';
import { parsePositiveInteger, parseQuality, resolveCliOptions } from '../../src/cli/options.js';

describe('CLI option parsing', () => {
  it('parses positive integer options', () => {
    expect(parsePositiveInteger('4', 1, '--concurrency')).toBe(4);
    expect(parsePositiveInteger(undefined, 2, '--concurrency')).toBe(2);
  });

  it('rejects invalid positive integer options', () => {
    expect(() => parsePositiveInteger('0', 1, '--concurrency')).toThrow(
      '--concurrency must be a positive number.',
    );
    expect(() => parsePositiveInteger('nope', 1, '--concurrency')).toThrow(
      '--concurrency must be a positive number.',
    );
  });

  it('keeps quality inside the supported range', () => {
    expect(parseQuality('90')).toBe(90);
    expect(parseQuality(undefined)).toBe(DEFAULT_OPTIONS.quality);
    expect(() => parseQuality('101')).toThrow('--quality must be between 1 and 100.');
  });

  it('resolves raw CLI and prompted values into CrushOptions', () => {
    expect(
      resolveCliOptions(
        {
          quality: '75',
          concurrency: '3',
          overwrite: true,
        },
        {
          dryRun: true,
          deleteOriginals: false,
        },
      ),
    ).toEqual({
      dryRun: true,
      quality: 75,
      deleteOriginals: false,
      concurrency: 3,
      overwrite: true,
    });
  });
});
