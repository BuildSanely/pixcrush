import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import fs from 'fs/promises';
import path from 'path';
import { CodeUpdateResult, ConversionResult } from '../types.js';
import { mapWithConcurrency } from '../utils/concurrency.js';

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;
const IMAGE_EXT_RE = /\.(png|jpe?g)$/i;

interface TextReplacement {
  start: number;
  end: number;
  value: string;
}

function applyTextReplacements(code: string, replacements: TextReplacement[]): string {
  return replacements
    .sort((a, b) => b.start - a.start)
    .reduce(
      (updatedCode, replacement) =>
        updatedCode.slice(0, replacement.start) +
        replacement.value +
        updatedCode.slice(replacement.end),
      code,
    );
}

function findMatchedOriginalPath(
  source: string,
  file: string,
  conversionMap: Map<string, string>,
): string | undefined {
  if (source.startsWith('/')) {
    const cleanSource = source.replace(/^\//, '');
    for (const [origPath] of conversionMap.entries()) {
      if (origPath.endsWith(path.join('public', cleanSource)) || origPath.endsWith(cleanSource)) {
        return origPath;
      }
    }
    return undefined;
  }

  const relativePath = path.normalize(path.resolve(path.dirname(file), source));
  if (conversionMap.has(relativePath)) {
    return relativePath;
  }

  const cleanSource = source.replace(/^@\/?|^~/, '');
  for (const [origPath] of conversionMap.entries()) {
    if (origPath.endsWith(cleanSource)) {
      return origPath;
    }
  }

  return undefined;
}

function getUpdatedImageSource(
  fullOriginalSource: string,
  file: string,
  conversionMap: Map<string, string>,
): string | undefined {
  const sourceWithoutQuery = fullOriginalSource.split('?')[0];
  if (!IMAGE_EXT_RE.test(sourceWithoutQuery)) return undefined;

  const matchedOriginalPath = findMatchedOriginalPath(sourceWithoutQuery, file, conversionMap);
  if (!matchedOriginalPath) return undefined;

  const queryParam = fullOriginalSource.includes('?') ? '?' + fullOriginalSource.split('?')[1] : '';
  return sourceWithoutQuery.replace(IMAGE_EXT_RE, '.webp') + queryParam;
}

function rewriteHtmlImageReferences(
  code: string,
  file: string,
  conversionMap: Map<string, string>,
): { code: string; isModified: boolean } {
  let isModified = false;
  let updatedCode = code;

  // Handle srcset-like attributes where each segment can carry a density descriptor.
  updatedCode = updatedCode.replace(
    /\b(?:srcset|data-srcset)\s*=\s*(["'])(.*?)\1/gi,
    (full, quote, rawValue) => {
      const segments = rawValue.split(',');
      const rewrittenSegments = segments.map((segment: string) => {
        const tokenMatch = /^(\s*)(\S+)/.exec(segment);
        if (!tokenMatch) return segment;

        const urlToken = tokenMatch[2];
        const updatedSource = getUpdatedImageSource(urlToken, file, conversionMap);
        if (!updatedSource) return segment;

        isModified = true;
        const tokenStart = tokenMatch[1].length;
        return (
          segment.slice(0, tokenStart) + updatedSource + segment.slice(tokenStart + urlToken.length)
        );
      });

      const valueStart = full.indexOf(quote) + 1;
      return (
        full.slice(0, valueStart) +
        rewrittenSegments.join(',') +
        full.slice(valueStart + rawValue.length)
      );
    },
  );

  // Handle plain URL-bearing attributes that can reference images in HTML.
  updatedCode = updatedCode.replace(
    /\b(?:src|href|poster|content|data-src)\s*=\s*(["'])(.*?)\1/gi,
    (full, quote, rawValue) => {
      const updatedSource = getUpdatedImageSource(rawValue, file, conversionMap);
      if (!updatedSource) return full;

      isModified = true;
      const valueStart = full.indexOf(quote) + 1;
      return full.slice(0, valueStart) + updatedSource + full.slice(valueStart + rawValue.length);
    },
  );

  return { code: updatedCode, isModified };
}

function rewriteJsonStringValue(
  value: string,
  file: string,
  conversionMap: Map<string, string>,
): { value: string; modified: boolean } {
  const directUpdate = getUpdatedImageSource(value, file, conversionMap);
  if (directUpdate) {
    return { value: directUpdate, modified: true };
  }

  let modified = false;
  const segments = value.split(',');
  const rewrittenSegments = segments.map((segment) => {
    const tokenMatch = /^(\s*)(\S+)/.exec(segment);
    if (!tokenMatch) return segment;

    const urlToken = tokenMatch[2];
    const updatedSource = getUpdatedImageSource(urlToken, file, conversionMap);
    if (!updatedSource) return segment;

    modified = true;
    const tokenStart = tokenMatch[1].length;
    return (
      segment.slice(0, tokenStart) + updatedSource + segment.slice(tokenStart + urlToken.length)
    );
  });

  if (!modified) {
    return { value, modified: false };
  }

  return { value: rewrittenSegments.join(','), modified: true };
}

function rewriteJsonImageReferences(
  code: string,
  file: string,
  conversionMap: Map<string, string>,
): { code: string; isModified: boolean } {
  const replacements: TextReplacement[] = [];
  const jsonStringPattern = /"(?:\\.|[^"\\])*"/g;
  let match: RegExpExecArray | null;

  while ((match = jsonStringPattern.exec(code)) !== null) {
    const rawLiteral = match[0];
    const afterLiteral = code.slice(match.index + rawLiteral.length);
    if (/^\s*:/.test(afterLiteral)) continue;

    const value = JSON.parse(rawLiteral) as string;
    const rewritten = rewriteJsonStringValue(value, file, conversionMap);
    if (!rewritten.modified) continue;

    replacements.push({
      start: match.index,
      end: match.index + rawLiteral.length,
      value: JSON.stringify(rewritten.value),
    });
  }

  return {
    code: applyTextReplacements(code, replacements),
    isModified: replacements.length > 0,
  };
}

export async function updateCodeReferences(
  codeFiles: string[],
  conversions: ConversionResult[],
  targetDir: string,
  dryRun: boolean,
  concurrency: number,
): Promise<CodeUpdateResult> {
  let updatedFilesCount = 0;
  const parseFailureFiles: string[] = [];

  const conversionMap = new Map<string, string>();
  for (const c of conversions) {
    if (c.status === 'converted' && c.newPath) {
      conversionMap.set(path.normalize(c.originalPath), path.normalize(c.newPath));
    }
  }

  if (conversionMap.size === 0) {
    return { updatedFilesCount: 0, parseFailureFiles };
  }

  await mapWithConcurrency(codeFiles, concurrency, async (file) => {
    const code = await fs.readFile(file, 'utf8');
    const fileExt = path.extname(file).toLowerCase();

    if (fileExt === '.html' || fileExt === '.htm') {
      const rewritten = rewriteHtmlImageReferences(code, file, conversionMap);
      if (rewritten.isModified) {
        updatedFilesCount++;
        if (!dryRun) {
          await fs.writeFile(file, rewritten.code);
        }
      }
      return;
    }

    if (fileExt === '.json') {
      try {
        JSON.parse(code);
        const rewritten = rewriteJsonImageReferences(code, file, conversionMap);
        if (rewritten.isModified) {
          updatedFilesCount++;
          if (!dryRun) {
            await fs.writeFile(file, rewritten.code);
          }
        }
      } catch {
        parseFailureFiles.push(path.relative(targetDir, file));
      }
      return;
    }

    let ast;
    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });
    } catch {
      parseFailureFiles.push(path.relative(targetDir, file));
      return;
    }

    const replacements: TextReplacement[] = [];

    traverse(ast, {
      StringLiteral(pathNode: any) {
        const source = pathNode.node.value;
        if (typeof source !== 'string') return;

        // Save the raw original in case there was a query param we need to preserve visually
        const fullOriginalSource = source;

        const newSource = getUpdatedImageSource(fullOriginalSource, file, conversionMap);
        if (!newSource) return;

        const start = pathNode.node.start;
        const end = pathNode.node.end;
        if (typeof start !== 'number' || typeof end !== 'number') return;

        const rawValue = code.slice(start + 1, end - 1);
        replacements.push({
          start: start + 1,
          end: end - 1,
          value: rawValue.replace(/\.(png|jpe?g)(?=\?|$)/i, '.webp'),
        });
      },
    });

    if (replacements.length > 0) {
      updatedFilesCount++;
      if (!dryRun) {
        await fs.writeFile(file, applyTextReplacements(code, replacements));
      }
    }
  });

  return { updatedFilesCount, parseFailureFiles };
}
