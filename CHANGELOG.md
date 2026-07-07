# Changelog

All notable changes to pixcrush will be documented here.

## 1.0.9 - 2026-07-07

### Added

- Added bounded concurrency for image conversion, source analysis, code reference updates, and cleanup
- Added `--concurrency <number>` to control how many files are processed at once
- Added `--overwrite` to explicitly replace existing `.webp` files
- Added atomic WebP writes to avoid partial output files if a write fails
- Added structured conversion reporting for converted, skipped-larger, skipped-existing, and failed images
- Added dedicated tests for concurrency, image conversion edge cases, CLI option parsing, summary helpers, filesystem helpers, and the full pipeline

### Changed

- Refactored the CLI, pipeline orchestration, reporting, summary logic, deletion, and filesystem helpers into clearer modules
- Moved tests into a top-level `test/` directory so `src/` only contains source code
- Updated TypeScript config to include Node types and the new `test/` directory
- Updated README documentation for concurrency, overwrite behavior, safe writes, and batch performance

### Fixed

- Fixed CLI `--version` output to match the package version
- Preserved existing `.webp` files by default unless `--overwrite` is provided
- Improved per-image failure handling so corrupt or unsupported images do not stop the whole batch

---

## [1.0.8] - 2026-07-05

### Fixed

- Preserve existing formatting when updating image references in JavaScript, TypeScript, JSX, HTML, and JSON files
- Preserve attribute spacing, quote style, `srcset` descriptors, indentation, and line endings while replacing image extensions

### Changed

- Replaced whole-file Babel code generation with targeted text edits
- Removed the unused `@babel/generator` dependency

---

## [1.0.7] - 2026-03-22

### Changed

- Updated changelog entries and release notes organization

---

## [1.0.6] - 2026-03-22

### Added

- Added source scanning support for `.json` files
- Added image usage tracking from nested JSON string values (including manifest-like structures)
- Added rewrite support for image references in `.json` values, with query-string preservation

---

## [1.0.5] - 2026-03-22

### Added

- Added source scanning support for `.html` and `.htm` files
- Added image usage tracking from HTML attributes (`src`, `srcset`, `poster`, `href`, `content`, `data-src`, `data-srcset`)
- Added rewrite support for image references in `.html`/`.htm` files, including `srcset`-style values and query-string preservation

---

## [1.0.4] - 2026-02-28

### Fixed

- Track image candidates referenced in `srcset` / `srcSet` strings so they are no longer marked as unused
- Prevent original images from being deleted during conversion before source code rewrites complete
- Safety-gate deletion of converted originals and unused images when source files fail to parse

### Changed

- Moved shared TypeScript interfaces into a dedicated `src/types.ts` module

---

## [1.0.1] - 2026-02-26

### Changed

- Removed "Future Plans" section from README
- Minor README cleanup

---

## [1.0.0] - 2026-02-26

### Added

- Initial release
- Scan PNG/JPG images in React, Next.js, and Turborepo projects
- Convert used images to WebP using `sharp` (skips conversion if WebP is larger)
- Automatically rewrite import paths and JSX `src` attributes via Babel AST
- Interactive prompts for dry-run and delete-originals options when no flags are passed
- `--dry-run` flag to preview changes without writing files
- `--delete-originals` flag to remove original images after conversion
- `--quality` flag to control WebP compression quality (default: 80)
- Orphan detection — reports images that are not referenced in any source file
- Garbage collection — deletes unused images when `--delete-originals` is set
- SEO safe — skips `favicon*.png`, `apple-icon*.png`, `opengraph-image*.png`, and PWA manifest icons
- Next.js and Turborepo path resolution for deeply nested `public/` directories
- `DEBUG_CRUSH=1` environment variable for verbose path resolution logging
