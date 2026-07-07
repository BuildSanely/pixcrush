import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../../src/utils/concurrency.js';

describe('mapWithConcurrency', () => {
  it('preserves result order while respecting the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return value * 10;
    });

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('keeps draining the queue before reporting task failures', async () => {
    const attempted: number[] = [];

    await expect(
      mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
        attempted.push(value);
        if (value === 2) {
          throw new Error('boom');
        }
        return value;
      }),
    ).rejects.toThrow('1 concurrent task(s) failed.');

    expect(attempted.sort()).toEqual([1, 2, 3, 4]);
  });
});
