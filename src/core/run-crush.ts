import * as p from '@clack/prompts';
import { scanDirectory } from '../scanner/index.js';
import { trackAndReconcileImages } from '../processor/tracker.js';
import { convertImagesToWebp } from '../processor/image.js';
import { updateCodeReferences } from '../processor/codemod.js';
import { CrushOptions } from '../types.js';
import { deleteFiles } from './delete-files.js';
import {
  buildRunSummary,
  calculateSpaceSavedBytes,
  formatMegabytes,
  summarizeConversions,
} from './summary.js';
import {
  printConversionWarnings,
  printParseFailureWarning,
  printRunSummary,
  printTrackerWarnings,
  printUnusedImagesNote,
} from './report.js';

export async function runCrush(targetDir: string, options: CrushOptions) {
  const s = p.spinner();

  // Phase 1: Scan
  s.start('Scanning codebase for images and source files...');
  const { imageFiles, codeFiles } = await scanDirectory(targetDir);
  s.stop(`Found ${imageFiles.length} images and ${codeFiles.length} source files.`);

  if (imageFiles.length === 0) {
    p.note('No images found to process.', 'info');
    return;
  }

  // Phase 2: Analyze
  s.start('Analyzing code to find used images...');
  const {
    usedImages,
    unusedImages,
    warnings: trackWarnings,
    parseFailureFiles: trackerParseFailureFiles,
  } = await trackAndReconcileImages(codeFiles, imageFiles, targetDir, options.concurrency);
  s.stop(`Identified ${usedImages.length} used images and ${unusedImages.length} unused images.`);

  if (usedImages.length === 0) {
    p.note('No used images found in your code. Skipping conversion.', 'info');
    if (unusedImages.length > 0) {
      if (options.deleteOriginals && !options.dryRun && trackerParseFailureFiles.length === 0) {
        s.start(`Deleting ${unusedImages.length} unused image files...`);
        const deletedCount = await deleteFiles(unusedImages, options.concurrency);
        s.stop(`Deleted ${deletedCount} unused images.`);
      } else if (
        options.deleteOriginals &&
        !options.dryRun &&
        trackerParseFailureFiles.length > 0
      ) {
        p.log.warn(
          `Skipped deleting unused images because ${trackerParseFailureFiles.length} source files could not be parsed during analysis.`,
        );
      } else {
        p.log.warn(`You have ${unusedImages.length} unused image files taking up space!`);
      }
    }
    return;
  }

  // Phase 3: Convert Image
  s.start(`Converting ${usedImages.length} used images to WebP...`);
  const conversions = await convertImagesToWebp(
    usedImages,
    options.quality,
    options.dryRun,
    options.overwrite,
    options.concurrency,
  );

  const conversionSummary = summarizeConversions(conversions);
  const successfulConversions = conversionSummary.converted;
  const savedBytes = calculateSpaceSavedBytes(successfulConversions);

  s.stop(
    `Converted ${successfulConversions.length} images (saved ${formatMegabytes(savedBytes)} MB).`,
  );

  // Phase 4: AST Codemod
  let updatedFilesCount = 0;
  let codemodParseFailureFiles: string[] = [];
  if (successfulConversions.length > 0) {
    s.start('Updating React code references...');
    const codeUpdateResult = await updateCodeReferences(
      codeFiles,
      successfulConversions,
      targetDir,
      options.dryRun,
      options.concurrency,
    );
    updatedFilesCount = codeUpdateResult.updatedFilesCount;
    codemodParseFailureFiles = codeUpdateResult.parseFailureFiles;
    s.stop(`Updated ${updatedFilesCount} source files.`);
  }

  // Phase 5: Cleanup originals and unused images
  const canDeleteSafely =
    trackerParseFailureFiles.length === 0 && codemodParseFailureFiles.length === 0;
  let deletedConvertedCount = 0;
  let deletedUnusedCount = 0;

  if (options.deleteOriginals && !options.dryRun) {
    if (!canDeleteSafely) {
      p.log.warn(
        `Skipped deleting originals/unused images because ${
          trackerParseFailureFiles.length + codemodParseFailureFiles.length
        } source files could not be parsed.`,
      );
    } else {
      if (successfulConversions.length > 0) {
        s.start(`Deleting ${successfulConversions.length} converted original image files...`);
        deletedConvertedCount = await deleteFiles(
          successfulConversions.map((conversion) => conversion.originalPath),
          options.concurrency,
        );
        s.stop(`Deleted ${deletedConvertedCount} converted originals.`);
      }

      if (unusedImages.length > 0) {
        s.start(`Deleting ${unusedImages.length} unused image files...`);
        deletedUnusedCount = await deleteFiles(unusedImages, options.concurrency);
        s.stop(`Deleted ${deletedUnusedCount} unused images.`);
      }
    }
  }

  const runSummary = buildRunSummary({
    totalImages: imageFiles.length,
    usedImages: usedImages.length,
    conversionSummary,
    codeFilesUpdated: updatedFilesCount,
    concurrency: options.concurrency,
    convertedOriginalsDeleted: deletedConvertedCount,
    unusedImagesDeleted: deletedUnusedCount,
  });

  printRunSummary(runSummary, options);
  printConversionWarnings(conversionSummary, targetDir);
  printTrackerWarnings(trackWarnings);
  printUnusedImagesNote(unusedImages, targetDir, options, canDeleteSafely, deletedUnusedCount);
  printParseFailureWarning(
    trackerParseFailureFiles.length,
    codemodParseFailureFiles.length,
    options,
  );
}
