import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'path';
import { ConversionResult, ConversionSummary, CrushOptions, RunSummary } from '../types.js';
import { formatMegabytes } from './summary.js';

function logSampledConversionMessages(
  title: string,
  conversions: ConversionResult[],
  targetDir: string,
  formatter: (conversion: ConversionResult) => string,
) {
  if (conversions.length === 0) return;

  p.log.warn(`${title} (${conversions.length}):`);
  conversions.slice(0, 5).forEach((conversion) => {
    p.log.message(
      pc.yellow(`  - ${path.relative(targetDir, conversion.originalPath)}${formatter(conversion)}`),
    );
  });

  if (conversions.length > 5) {
    p.log.message(pc.yellow(`  ...and ${conversions.length - 5} more`));
  }
}

export function printRunSummary(summary: RunSummary, options: CrushOptions) {
  p.log.message('\n' + pc.bgGreen(pc.black(' SUMMARY ')));
  p.log.step(`Total Images Found: ${summary.totalImages}`);
  p.log.step(`Used Images: ${summary.usedImages}`);
  p.log.step(`Images Converted: ${summary.convertedImages}`);
  p.log.step(`Skipped - WebP Larger: ${summary.skippedLargerImages}`);
  p.log.step(`Skipped - WebP Exists: ${summary.skippedExistingImages}`);
  p.log.step(`Failed Conversions: ${summary.failedConversions}`);
  p.log.step(`Space Saved: ${formatMegabytes(summary.spaceSavedBytes)} MB`);
  p.log.step(`Code Files Updated: ${summary.codeFilesUpdated}`);
  p.log.step(`Concurrency: ${summary.concurrency}`);

  if (options.deleteOriginals && !options.dryRun) {
    p.log.step(`Converted Originals Deleted: ${summary.convertedOriginalsDeleted}`);
    p.log.step(`Unused Images Deleted: ${summary.unusedImagesDeleted}`);
  }
}

export function printConversionWarnings(conversionSummary: ConversionSummary, targetDir: string) {
  logSampledConversionMessages(
    'Skipped because WebP would be larger',
    conversionSummary.skippedLarger,
    targetDir,
    (conversion) =>
      conversion.newSize > 0
        ? ` (${(conversion.originalSize / 1024).toFixed(1)} KB → ${(
            conversion.newSize / 1024
          ).toFixed(1)} KB)`
        : '',
  );
  logSampledConversionMessages(
    'Skipped because WebP already exists',
    conversionSummary.skippedExisting,
    targetDir,
    () => '',
  );
  logSampledConversionMessages(
    'Failed image conversions',
    conversionSummary.failed,
    targetDir,
    (conversion) => (conversion.error ? ` — ${conversion.error}` : ''),
  );
}

export function printTrackerWarnings(warnings: string[]) {
  if (warnings.length === 0) return;

  p.log.warn(`Warnings (${warnings.length}):`);
  warnings.slice(0, 5).forEach((warning) => p.log.message(pc.yellow(`  - ${warning}`)));

  if (warnings.length > 5) {
    p.log.message(pc.yellow(`  ...and ${warnings.length - 5} more`));
  }
}

export function printUnusedImagesNote(
  unusedImages: string[],
  targetDir: string,
  options: CrushOptions,
  canDeleteSafely: boolean,
  deletedUnusedCount: number,
) {
  if (unusedImages.length === 0) return;

  if (options.deleteOriginals && !options.dryRun && canDeleteSafely) {
    p.note(`Successfully deleted ${deletedUnusedCount} unused images.`, 'Unused Images Cleaned Up');
    return;
  }

  if (options.deleteOriginals && !options.dryRun && !canDeleteSafely) {
    p.note(
      'Unused images were not deleted because some source files failed to parse. Run in dry-run mode and inspect warnings before deleting.',
      'Unused Images Not Deleted',
    );
    return;
  }

  p.note(
    unusedImages
      .slice(0, 5)
      .map((unusedImage) => `- ${path.relative(targetDir, unusedImage)}`)
      .join('\n') + (unusedImages.length > 5 ? `\n...and ${unusedImages.length - 5} more` : ''),
    `Unused Images Detected & Skipped (${unusedImages.length})`,
  );
}

export function printParseFailureWarning(
  trackerParseFailureCount: number,
  codemodParseFailureCount: number,
  options: CrushOptions,
) {
  const parseFailureCount = trackerParseFailureCount + codemodParseFailureCount;
  if (parseFailureCount === 0) return;

  if (options.deleteOriginals && !options.dryRun) {
    p.log.warn(
      `Parser skipped ${parseFailureCount} source files. Deletion was safety-gated for this run.`,
    );
    return;
  }

  p.log.warn(
    `Parser skipped ${parseFailureCount} source files. Review warnings before running with --delete-originals.`,
  );
}
