#!/usr/bin/env node

/**
 * find-orphans.mjs
 *
 * Asset-inventory check for public/catalogs/. Compares JSON declarations vs filesystem:
 *   • MISSING  — declared in content.json / slider.json but absent on disk
 *   • ORPHAN   — present on disk but no JSON reference AND not matched by
 *               an auto-discovery rule from catalog-loader.ts
 *
 * Auto-discovery rules mirrored from src/lib/catalog-loader.ts:
 *   • hero/hero_*.webp                      → discoverHeroImages
 *   • materials|finishes/metro {RAL|U|W}\d+ → scanMaterialsFolder
 *
 * Responsive variants (*-NNNw.webp) are managed separately by
 * generate-thumbnails.mjs and are ignored here.
 *
 * Usage:
 *   node scripts/find-orphans.mjs              # summary report
 *   node scripts/find-orphans.mjs --verbose    # + per-file decision and reason
 *   node scripts/find-orphans.mjs --delete     # delete orphans + their -Nw variants
 *   node scripts/find-orphans.mjs --json       # machine-readable output
 */

import fs from 'fs/promises';
import path from 'path';
import { pathsFromScript, isResponsiveVariant } from './lib/image-utils.mjs';

const { PUBLIC } = pathsFromScript(import.meta.url);

const args = process.argv.slice(2);
const DELETE = args.includes('--delete');
const JSON_OUT = args.includes('--json');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function log(...m) {
  if (!JSON_OUT) console.log(...m);
}

const ASSET_EXTS = new Set(['.webp', '.mp4', '.svg', '.jpg', '.jpeg', '.png']);
const REFERENCE_FIELDS = new Set([
  'image',
  'heroImage',
  'packshotImage',
  'previewImage',
  'detailImage',
  'src',
  'thumbnail',
]);

// ---------------------------------------------------------------------------
// JSON walk → collect declared asset paths
// ---------------------------------------------------------------------------

function walkJsonForAssets(obj, sink) {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    for (const item of obj) walkJsonForAssets(item, sink);
    return;
  }
  if (typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    if (REFERENCE_FIELDS.has(key) && typeof value === 'string' && value) {
      sink.push(value);
    } else if (key === 'video' && value && typeof value === 'object') {
      if (typeof value.src === 'string' && value.src) sink.push(value.src);
    } else {
      walkJsonForAssets(value, sink);
    }
  }
}

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Collect declared asset paths from a section's content.json + slider.json */
async function readSectionDeclarations(sectionDir) {
  const declared = [];
  const content = await readJsonSafe(path.join(sectionDir, 'content.json'));
  if (content) walkJsonForAssets(content, declared);

  const slider = await readJsonSafe(path.join(sectionDir, 'slider.json'));
  if (slider?.slides) {
    for (const slide of slider.slides) {
      if (typeof slide?.image === 'string' && slide.image) declared.push(slide.image);
    }
  }

  return {
    declared,
    hasContentJson: content !== null,
    hasSliderJson: slider !== null,
  };
}

// ---------------------------------------------------------------------------
// Auto-discovery rules (mirror catalog-loader.ts)
// ---------------------------------------------------------------------------

function isAutoDiscoveredHero(fileName) {
  const base = path.parse(fileName).name;
  return base.startsWith('hero_');
}

function isAutoDiscoveredMaterial(fileName) {
  const parsed = path.parse(fileName);
  if (parsed.ext.toLowerCase() !== '.webp') return false;
  const base = parsed.name.endsWith('_thumb')
    ? parsed.name.slice(0, -'_thumb'.length)
    : parsed.name;
  const normalized = base.replace(/^metro[_ -]*/i, '').trim();
  return /^(RAL\s*\d+|[UW]\d+)(?:[\s_-]+.+)?$/i.test(normalized);
}

function isAutoDiscoveredInSection(sectionName, fileName) {
  if (sectionName === 'hero') return isAutoDiscoveredHero(fileName);
  if (sectionName === 'materials' || sectionName === 'finishes') {
    return isAutoDiscoveredMaterial(fileName);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Resolve declared path → expected file location
// ---------------------------------------------------------------------------

/** Convert a JSON-declared path to an absolute filesystem path. */
function resolveDeclaredPath(declared, sectionDir) {
  if (/^https?:\/\//i.test(declared)) return null; // external URL, can't check
  if (declared.startsWith('/')) {
    // Absolute path relative to public/  (e.g. "/catalogs/TS/dimensions/axo_ts.svg")
    return path.join(PUBLIC, declared);
  }
  // Relative — sits in the same section folder as the JSON
  return path.join(sectionDir, declared);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-section audit
// ---------------------------------------------------------------------------

async function auditSection(catalogName, sectionName, sectionDir) {
  // 1. List actual asset files on disk (skip responsive variants)
  let entries;
  try {
    entries = await fs.readdir(sectionDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const baseAssets = [];
  let variantCount = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ASSET_EXTS.has(ext)) continue;
    if (entry.name.endsWith('.webp') && isResponsiveVariant(entry.name)) {
      variantCount++;
      continue;
    }
    baseAssets.push(entry.name);
  }

  // 2. Collect JSON declarations
  const { declared, hasContentJson, hasSliderJson } = await readSectionDeclarations(sectionDir);

  // Section is "empty / not interesting" — no JSON refs and no files
  if (declared.length === 0 && baseAssets.length === 0 && variantCount === 0) {
    return null;
  }

  // 3. MISSING: declared in JSON but file missing on disk
  const missing = [];
  for (const decl of declared) {
    const target = resolveDeclaredPath(decl, sectionDir);
    if (!target) continue;
    if (!(await fileExists(target))) {
      missing.push({
        catalog: catalogName,
        section: sectionName,
        declared: decl,
        expected: path.relative(PUBLIC, target),
      });
    }
  }

  // 4. ORPHANS: on disk but no reference + not auto-discovered
  //    Build a set of "kept" filenames: anything referenced from JSON in THIS section,
  //    by basename (so absolute paths like /catalogs/X/dimensions/axo.svg work too).
  const referencedNames = new Set(declared.map((p) => path.posix.basename(p)));

  const orphans = [];
  const decisions = [];

  for (const fileName of baseAssets) {
    let kept, reason;

    if (referencedNames.has(fileName)) {
      kept = true;
      reason = 'referenced in content.json / slider.json';
    } else if (isAutoDiscoveredInSection(sectionName, fileName)) {
      kept = true;
      reason = `auto-discovered by catalog-loader (${sectionName} pattern)`;
    } else {
      kept = false;
      reason = 'NOT referenced and NOT auto-discovered → ORPHAN';
    }

    decisions.push({ file: fileName, kept, reason });

    if (!kept) {
      const full = path.join(sectionDir, fileName);
      const stat = await fs.stat(full);
      orphans.push({
        catalog: catalogName,
        section: sectionName,
        file: full,
        relative: path.relative(PUBLIC, full),
        bytes: stat.size,
      });
    }
  }

  return {
    catalog: catalogName,
    section: sectionName,
    hasContentJson,
    hasSliderJson,
    declared: declared.length,
    baseAssets: baseAssets.length,
    variantCount,
    missing,
    orphans,
    decisions,
  };
}

async function findRelatedVariants(orphanPath) {
  const dir = path.dirname(orphanPath);
  const parsed = path.parse(orphanPath);
  const escaped = parsed.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const variantRegex = new RegExp(`^${escaped}-\\d+w\\.webp$`, 'i');

  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => variantRegex.test(f))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Walk catalogs
// ---------------------------------------------------------------------------

async function auditAll() {
  const sectionReports = [];
  const catalogsDir = path.join(PUBLIC, 'catalogs');

  let catalogs;
  try {
    catalogs = await fs.readdir(catalogsDir, { withFileTypes: true });
  } catch {
    return sectionReports;
  }

  for (const catalog of catalogs) {
    if (!catalog.isDirectory()) continue;
    const catalogDir = path.join(catalogsDir, catalog.name);
    const sections = await fs.readdir(catalogDir, { withFileTypes: true });

    for (const section of sections) {
      if (!section.isDirectory()) continue;
      const report = await auditSection(
        catalog.name,
        section.name,
        path.join(catalogDir, section.name),
      );
      if (report) sectionReports.push(report);
    }
  }

  return sectionReports;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const reports = await auditAll();
  const allOrphans = reports.flatMap((r) => r.orphans);
  const allMissing = reports.flatMap((r) => r.missing);

  if (JSON_OUT) {
    console.log(JSON.stringify({ reports, allOrphans, allMissing }, null, 2));
    return;
  }

  log(c.bold('\nAsset audit — sections with files or JSON declarations:\n'));
  log(
    `  ${c.dim('catalog/section'.padEnd(28))}  ${c.dim('decl')}  ${c.dim('bases')}  ${c.dim('vars')}  ${c.dim('missing')}  ${c.dim('orphan')}`,
  );

  const byCatalog = {};
  for (const r of reports) (byCatalog[r.catalog] ??= []).push(r);

  for (const cat of Object.keys(byCatalog).sort()) {
    for (const r of byCatalog[cat]) {
      const label = `${r.catalog}/${r.section}`.padEnd(28);
      const decl = String(r.declared).padStart(4);
      const bases = String(r.baseAssets).padStart(5);
      const vars = String(r.variantCount).padStart(4);
      const missing = r.missing.length > 0
        ? c.red(String(r.missing.length).padStart(7))
        : c.green('0'.padStart(7));
      const orphan = r.orphans.length > 0
        ? c.red(String(r.orphans.length).padStart(6))
        : c.green('0'.padStart(6));
      log(`  ${label}  ${decl}  ${bases}  ${vars}  ${missing}  ${orphan}`);
    }
  }

  if (VERBOSE) {
    log(c.bold('\nPer-file decisions:\n'));
    for (const r of reports) {
      if (r.decisions.length === 0 && r.missing.length === 0) continue;
      log(c.cyan(`  ${r.catalog}/${r.section}/`));
      for (const d of r.decisions) {
        const marker = d.kept ? c.green('  KEEP') : c.red('ORPHAN');
        log(`    ${marker}  ${d.file.padEnd(48)} ${c.dim(d.reason)}`);
      }
      for (const m of r.missing) {
        log(`    ${c.red('MISSNG')}  ${m.declared.padEnd(48)} ${c.dim(`declared in JSON, expected at ${m.expected}`)}`);
      }
    }
  } else {
    log(c.dim('\n  Run with --verbose to see per-file decisions.'));
  }

  if (allMissing.length > 0) {
    log(c.bold(c.red(`\nMissing files (${allMissing.length}) — declared in JSON but absent on disk:\n`)));
    for (const m of allMissing) {
      log(`  ${c.cyan(`${m.catalog}/${m.section}`)}  declared: ${c.yellow(m.declared)}  →  expected: ${m.expected}`);
    }
  }

  if (allOrphans.length > 0) {
    log(c.bold(c.red(`\nOrphan files (${allOrphans.length}):\n`)));
    const orphansByCatalog = {};
    let totalBytes = 0;
    for (const o of allOrphans) {
      (orphansByCatalog[o.catalog] ??= []).push(o);
      totalBytes += o.bytes;
    }
    for (const cat of Object.keys(orphansByCatalog).sort()) {
      log(c.cyan(`  ${cat}/`));
      for (const o of orphansByCatalog[cat]) {
        log(`    ${c.yellow(o.section.padEnd(16))} ${o.relative}  ${c.dim(`(${fmtBytes(o.bytes)})`)}`);
      }
    }
    log(c.bold(`\nTotal: ${allOrphans.length} orphan files, ${fmtBytes(totalBytes)}`));
  }

  if (allOrphans.length === 0 && allMissing.length === 0) {
    log(c.green('\n✓ All declared assets exist; no orphan files found.'));
  }

  if (!DELETE) {
    if (allOrphans.length > 0) {
      log(c.dim('\nRun with --delete to remove orphans (also removes their -Nw variants).'));
    }
    return;
  }

  if (allOrphans.length === 0) return;

  log(c.red('\nDeleting orphans + their responsive variants...'));
  let removedFiles = 0;
  let removedBytes = 0;

  for (const o of allOrphans) {
    const variants = await findRelatedVariants(o.file);
    for (const target of [o.file, ...variants]) {
      try {
        const stat = await fs.stat(target);
        await fs.unlink(target);
        removedFiles++;
        removedBytes += stat.size;
        log(c.dim(`  removed ${path.relative(PUBLIC, target)}`));
      } catch {
        // already gone
      }
    }
  }

  log(c.green(`\n✓ Removed ${removedFiles} files (${fmtBytes(removedBytes)}).`));
  log(c.dim('  Next: run `npm run thumbnails` to refresh the responsive-image manifest.'));
}

main().catch((err) => {
  console.error('find-orphans failed:', err);
  process.exit(1);
});
