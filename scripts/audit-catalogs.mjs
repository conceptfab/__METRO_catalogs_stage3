#!/usr/bin/env node

/**
 * audit-catalogs.mjs
 *
 * Per-catalog health check. For each catalog folder under public/catalogs/,
 * walks every section subfolder and reports:
 *
 *   files  = base assets on disk (responsive -NNNw.webp variants ignored)
 *   refs   = unique asset references declared in content.json / slider.json
 *   status = OK | MISSING | ORPHAN | STALE
 *
 * Auto-discovered files (hero/hero_*.webp, materials|finishes/metro {RAL|U|W}\d+)
 * count as referenced even when no JSON entry points at them — they mirror the
 * runtime behaviour of catalog-loader.ts.
 *
 * STALE = JSON declares a file that doesn't exist AND its name matches a known
 * scaffolding template (packshot.jpg, detail.webp). These are dead leftovers
 * from the original QX scaffold; runtime never renders them because the
 * configurator fallback in FinishesQX / MaterialsQX bypasses them.
 *
 * Usage:
 *   node scripts/audit-catalogs.mjs            # human report
 *   node scripts/audit-catalogs.mjs --json     # machine-readable
 *   node scripts/audit-catalogs.mjs --strict   # exit 1 if any MISSING/ORPHAN (STALE ignored)
 *   node scripts/audit-catalogs.mjs --fix      # delete orphan base files + responsive variants, then re-audit
 */

import fs from 'fs/promises';
import path from 'path';
import { pathsFromScript, isResponsiveVariant } from './lib/image-utils.mjs';

const { PUBLIC } = pathsFromScript(import.meta.url);
const CATALOGS_DIR = path.join(PUBLIC, 'catalogs');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const STRICT = args.includes('--strict');
const FIX = args.includes('--fix');

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

const log = (...m) => {
  if (!JSON_OUT) console.log(...m);
};

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

// Known scaffolding template names — declared in JSON but never had real files.
// Treated as STALE, not MISSING, so they don't pollute the report.
const STALE_TEMPLATE_NAMES = new Set([
  'packshot.jpg',
  'detail.webp',
]);

// ---------------------------------------------------------------------------
// JSON walk
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

  return [...new Set(declared)];
}

// ---------------------------------------------------------------------------
// Auto-discovery rules (mirror catalog-loader.ts)
// ---------------------------------------------------------------------------

function isAutoDiscoveredHero(fileName) {
  return path.parse(fileName).name.startsWith('hero_');
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
// Path resolution
// ---------------------------------------------------------------------------

function resolveDeclaredPath(declared, sectionDir) {
  if (/^https?:\/\//i.test(declared)) return null;
  if (declared.startsWith('/')) return path.join(PUBLIC, declared);
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
  let entries;
  try {
    entries = await fs.readdir(sectionDir, { withFileTypes: true });
  } catch {
    return null;
  }

  // Base files on disk (skip variants)
  const baseFiles = [];
  let variantCount = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ASSET_EXTS.has(ext)) continue;
    if (entry.name.endsWith('.webp') && isResponsiveVariant(entry.name)) {
      variantCount++;
      continue;
    }
    baseFiles.push(entry.name);
  }

  // JSON-declared references
  const declared = await readSectionDeclarations(sectionDir);

  // Empty + uninteresting → skip
  if (declared.length === 0 && baseFiles.length === 0 && variantCount === 0) {
    return null;
  }

  // Classify declared refs: missing | stale | resolved
  const missing = [];
  const stale = [];
  for (const decl of declared) {
    const target = resolveDeclaredPath(decl, sectionDir);
    if (!target) continue;
    if (await fileExists(target)) continue;
    const baseName = path.posix.basename(decl);
    if (STALE_TEMPLATE_NAMES.has(baseName)) {
      stale.push({ declared: decl, expected: path.relative(PUBLIC, target) });
    } else {
      missing.push({ declared: decl, expected: path.relative(PUBLIC, target) });
    }
  }

  // Orphan files: on disk, not referenced, not auto-discovered
  const referencedBasenames = new Set(declared.map((p) => path.posix.basename(p)));
  const orphans = [];
  for (const fileName of baseFiles) {
    if (referencedBasenames.has(fileName)) continue;
    if (isAutoDiscoveredInSection(sectionName, fileName)) continue;
    orphans.push(fileName);
  }

  // Status precedence: MISSING > ORPHAN > STALE > OK
  let status;
  if (missing.length > 0) status = 'MISSING';
  else if (orphans.length > 0) status = 'ORPHAN';
  else if (stale.length > 0) status = 'STALE';
  else status = 'OK';

  return {
    catalog: catalogName,
    section: sectionName,
    filesOnDisk: baseFiles.length,
    refsDeclared: declared.length,
    variants: variantCount,
    status,
    missing,
    orphans,
    stale,
  };
}

// ---------------------------------------------------------------------------
// Per-catalog walk
// ---------------------------------------------------------------------------

async function auditCatalog(catalogName) {
  const catalogDir = path.join(CATALOGS_DIR, catalogName);
  let sectionDirs;
  try {
    sectionDirs = (await fs.readdir(catalogDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return null;
  }

  const sections = [];
  for (const sectionName of sectionDirs) {
    const audit = await auditSection(
      catalogName,
      sectionName,
      path.join(catalogDir, sectionName),
    );
    if (audit) sections.push(audit);
  }

  return { catalog: catalogName, sections };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const STATUS_BADGE = {
  OK: c.green('OK     '),
  MISSING: c.red('MISSING'),
  ORPHAN: c.yellow('ORPHAN '),
  STALE: c.magenta('STALE  '),
};

function pad(value, width) {
  const s = String(value);
  return s + ' '.repeat(Math.max(0, width - s.length));
}

function renderCatalog({ catalog, sections }) {
  log('');
  log(c.bold(c.cyan(`══════ ${catalog} ══════`)));

  if (sections.length === 0) {
    log(c.dim('  (no section folders)'));
    return;
  }

  log(
    c.dim(
      `  ${pad('section', 18)}${pad('files', 7)}${pad('refs', 6)}${pad('variants', 10)}status`,
    ),
  );

  for (const s of sections) {
    log(
      `  ${pad(s.section, 18)}${pad(s.filesOnDisk, 7)}${pad(s.refsDeclared, 6)}${pad(s.variants, 10)}${STATUS_BADGE[s.status]}`,
    );

    for (const m of s.missing) {
      log(c.red(`      ✗ missing: ${m.declared}  (expected: ${m.expected})`));
    }
    for (const o of s.orphans) {
      log(c.yellow(`      ⚠ orphan:  ${o}`));
    }
    for (const st of s.stale) {
      log(c.magenta(`      • stale:   ${st.declared}  (scaffolding leftover)`));
    }
  }
}

function renderSummary(catalogs) {
  const sectionsByStatus = { OK: 0, MISSING: 0, ORPHAN: 0, STALE: 0 };
  const fileCounts = { MISSING: 0, ORPHAN: 0, STALE: 0 };
  let totalSections = 0;
  for (const cat of catalogs) {
    for (const s of cat.sections) {
      sectionsByStatus[s.status]++;
      totalSections++;
      fileCounts.MISSING += s.missing.length;
      fileCounts.ORPHAN += s.orphans.length;
      fileCounts.STALE += s.stale.length;
    }
  }
  log('');
  log(c.bold('═══════════ SUMMARY ═══════════'));
  log(`  catalogs:                  ${catalogs.length}`);
  log(`  sections:                  ${totalSections}`);
  log(`  ${c.green('OK')}:              ${String(sectionsByStatus.OK).padStart(11)} sections`);
  log(`  ${c.red('MISSING')}:         ${String(sectionsByStatus.MISSING).padStart(6)} sections  ${c.dim(`(${fileCounts.MISSING} files)`)}`);
  log(`  ${c.yellow('ORPHAN')}:          ${String(sectionsByStatus.ORPHAN).padStart(6)} sections  ${c.dim(`(${fileCounts.ORPHAN} files)`)}`);
  log(`  ${c.magenta('STALE')} (scaffold): ${String(sectionsByStatus.STALE).padStart(3)} sections  ${c.dim(`(${fileCounts.STALE} files)`)}`);
  return { sectionsByStatus, fileCounts };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let catalogNames;
  try {
    catalogNames = (await fs.readdir(CATALOGS_DIR, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch (err) {
    console.error(`Cannot read ${CATALOGS_DIR}:`, err.message);
    process.exit(2);
  }

  const results = [];
  for (const name of catalogNames) {
    const audit = await auditCatalog(name);
    if (audit) results.push(audit);
  }

  if (JSON_OUT) {
    if (FIX) {
      console.error('--fix cannot be combined with --json (delete output is human-only).');
      process.exit(2);
    }
    console.log(JSON.stringify(results, null, 2));
    if (STRICT) {
      const broken = results.some((r) =>
        r.sections.some((s) => s.status === 'MISSING' || s.status === 'ORPHAN'),
      );
      process.exit(broken ? 1 : 0);
    }
    return;
  }

  for (const r of results) renderCatalog(r);
  const totals = renderSummary(results);

  if (FIX) {
    const orphanList = [];
    for (const cat of results) {
      for (const s of cat.sections) {
        for (const fileName of s.orphans) {
          orphanList.push({
            section: `${cat.catalog}/${s.section}`,
            sectionDir: path.join(CATALOGS_DIR, cat.catalog, s.section),
            fileName,
          });
        }
      }
    }

    if (orphanList.length === 0) {
      log(c.green('\n--fix: no orphans to delete.'));
    } else {
      log(c.bold(c.yellow(`\n--fix: deleting ${orphanList.length} orphan base file(s) + their responsive variants...`)));
      let removedFiles = 0;
      let removedBytes = 0;
      for (const o of orphanList) {
        const baseFull = path.join(o.sectionDir, o.fileName);
        const parsed = path.parse(o.fileName);
        const escaped = parsed.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variantRegex = new RegExp(`^${escaped}-\\d+w\\.webp$`, 'i');

        const siblings = await fs.readdir(o.sectionDir).catch(() => []);
        const targets = [
          baseFull,
          ...siblings.filter((f) => variantRegex.test(f)).map((f) => path.join(o.sectionDir, f)),
        ];

        for (const t of targets) {
          try {
            const st = await fs.stat(t);
            await fs.unlink(t);
            removedFiles++;
            removedBytes += st.size;
            log(c.dim(`  removed ${path.relative(PUBLIC, t)}`));
          } catch {
            // already gone
          }
        }
      }
      const mb = (removedBytes / 1024 / 1024).toFixed(2);
      log(c.green(`\n✓ Removed ${removedFiles} files (${mb} MB).`));
      log(c.dim('  Re-run `npm run thumbnails` to refresh the responsive-image manifest.'));
    }
  }

  if (STRICT && (totals.sectionsByStatus.MISSING > 0 || totals.sectionsByStatus.ORPHAN > 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
