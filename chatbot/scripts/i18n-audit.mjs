#!/usr/bin/env node

/**
 * Chatbot i18n Audit Script
 * =========================
 * Analyzes the chatbot's translation dictionary (src/i18n.ts) against actual
 * usage in the Hono route source code.
 *
 * Report sections:
 *   1. Unused keys   — defined in the translation dictionary but never referenced
 *   2. Missing keys  — referenced in code (via t()/errorJson()) but not defined
 *   3. Most-used keys — ranked by number of files that reference them
 *   4. Parity check  — ensures en and es define the exact same keys
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 *
 * PHASE 1 - Parse src/i18n.ts
 *   Extracts the `en: { ... }` and `es: { ... }` object literals from the
 *   `translations` map via bracket matching, then pulls every quoted key.
 *
 * PHASE 2 - Scan source for usages
 *   Globs all .ts files under src/ (excluding i18n.ts itself) for:
 *     a) t('key', lang)
 *     b) errorJson(c, 'key', status)
 *
 * PHASE 3 - Cross-reference & report
 *   Compares defined keys vs. found usages.
 *
 * PHASE 4 - Parity check (en ↔ es)
 *   Compares the key sets of both languages.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   node scripts/i18n-audit.mjs                  # full report
 *   node scripts/i18n-audit.mjs --summary        # compact report (no full map)
 *   node scripts/i18n-audit.mjs --json           # raw JSON output
 *   node scripts/i18n-audit.mjs -h | --help      # show help
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  Chatbot i18n Audit Script
  ─────────────────────────
  Analyzes src/i18n.ts translations against t()/errorJson() usage in routes.

  Usage:
    node scripts/i18n-audit.mjs [options]

  Options:
    --top <n>       Number of most-used keys to show (default: 15)
    --summary       Compact output: skip the full usage map
    --json          Output raw JSON instead of the formatted report
    --ci            Exit with code 1 if unused/missing keys or parity issues are found
    -h, --help      Show this help message

  Examples:
    node scripts/i18n-audit.mjs                   # full report
    node scripts/i18n-audit.mjs --summary          # compact report
    node scripts/i18n-audit.mjs --json             # machine-readable output
    node scripts/i18n-audit.mjs --json | jq .parity
`);
  process.exit(0);
}

const TOP_N = Number(flag('top', '15'));
const JSON_OUT = args.includes('--json');
const SUMMARY = args.includes('--summary');
const CI_MODE = args.includes('--ci');

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(ROOT, 'src');
const I18N_FILE = join(SRC, 'i18n.ts');

const ALL_LANGS = ['en', 'es'];

// ── Phase 1: Parse src/i18n.ts ────────────────────────────────────────────────

/** Finds `${lang}: {` in the source and returns the matching object literal body. */
function extractLangBlock(code, lang) {
  const marker = `${lang}: {`;
  const start = code.indexOf(marker);
  if (start === -1) return null;

  const braceStart = start + marker.length - 1;
  let depth = 0;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) return code.slice(braceStart + 1, i);
    }
  }
  return null;
}

function extractKeys(blockBody) {
  const re = /^\s*['"]([^'"]+)['"]\s*:/gm;
  const keys = [];
  for (const m of blockBody.matchAll(re)) {
    keys.push(m[1]);
  }
  return [...new Set(keys)];
}

function parseTranslations(filePath) {
  const code = readFileSync(filePath, 'utf-8');
  const keysByLang = new Map();
  for (const lang of ALL_LANGS) {
    const block = extractLangBlock(code, lang);
    keysByLang.set(lang, block ? extractKeys(block) : []);
  }
  return keysByLang;
}

// ── Phase 2: Scan source files ────────────────────────────────────────────────

function walkDir(dir, extensions, skipFiles = []) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, extensions, skipFiles));
    } else if (extensions.includes(extname(entry.name)) && !skipFiles.includes(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  /** @type {Map<string, number[]>} key → line numbers */
  const usages = new Map();

  // t('key', lang)  or  errorJson(c, 'key', status)
  const re = /\b(?:errorJson\(\s*c\s*,\s*|t\(\s*)['"]([a-zA-Z_][\w.]*)['"]/g;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    for (const m of lines[i].matchAll(re)) {
      const key = m[1];
      if (!usages.has(key)) usages.set(key, []);
      usages.get(key).push(lineNo);
    }
  }

  return usages;
}

// ── Phase 3 & 4: Cross-reference & report ─────────────────────────────────────

function run() {
  const keysByLang = parseTranslations(I18N_FILE);
  const enKeys = keysByLang.get('en');

  const sourceFiles = walkDir(SRC, ['.ts'], [I18N_FILE]);

  /** @type {Map<string, {file: string, lines: number[]}[]>} */
  const usageMap = new Map();

  for (const file of sourceFiles) {
    const usages = scanFile(file);
    const relPath = relative(ROOT, file);
    for (const [key, lines] of usages) {
      if (!usageMap.has(key)) usageMap.set(key, []);
      usageMap.get(key).push({ file: relPath, lines });
    }
  }

  const unusedKeys = enKeys.filter((k) => !usageMap.has(k));
  const usedKeys = enKeys.filter((k) => usageMap.has(k));
  const missingKeys = [...usageMap.keys()].filter((k) => !enKeys.includes(k)).sort();

  const ranked = usedKeys
    .map((key) => {
      const entries = usageMap.get(key) ?? [];
      const fileCount = entries.length;
      const totalOccurrences = entries.reduce((sum, e) => sum + e.lines.length, 0);
      return { key, fileCount, totalOccurrences, entries };
    })
    .sort((a, b) => b.fileCount - a.fileCount || b.totalOccurrences - a.totalOccurrences);

  // Parity check
  const parityIssues = [];
  for (let i = 0; i < ALL_LANGS.length; i++) {
    for (let j = i + 1; j < ALL_LANGS.length; j++) {
      const langA = ALL_LANGS[i];
      const langB = ALL_LANGS[j];
      const keysA = new Set(keysByLang.get(langA));
      const keysB = new Set(keysByLang.get(langB));
      const onlyInA = [...keysA].filter((k) => !keysB.has(k)).sort();
      const onlyInB = [...keysB].filter((k) => !keysA.has(k)).sort();
      if (onlyInA.length > 0 || onlyInB.length > 0) {
        parityIssues.push({ langA, langB, onlyInA, onlyInB });
      }
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────

  if (JSON_OUT) {
    const report = {
      totalDefinedKeys: enKeys.length,
      totalUsedKeys: usedKeys.length,
      unusedKeys,
      missingKeys,
      ranking: ranked.map(({ key, fileCount, totalOccurrences, entries }) => ({
        key,
        fileCount,
        totalOccurrences,
        locations: entries.map((e) => ({ file: e.file, lines: e.lines })),
      })),
      parity: {
        languages: Object.fromEntries([...keysByLang].map(([l, keys]) => [l, keys.length])),
        inSync: parityIssues.length === 0,
        issues: parityIssues.map(({ langA, langB, onlyInA, onlyInB }) => ({
          pair: `${langA} ↔ ${langB}`,
          onlyIn: { [langA]: onlyInA, [langB]: onlyInB },
        })),
      },
    };
    console.log(JSON.stringify(report, null, 2));
    if (CI_MODE && (unusedKeys.length > 0 || missingKeys.length > 0 || parityIssues.length > 0)) {
      process.exit(1);
    }
    return;
  }

  // ── Pretty report ───────────────────────────────────────────────────────

  const SEP = '─'.repeat(78);
  const HEADER = '═'.repeat(78);

  console.log();
  console.log(HEADER);
  console.log('  CHATBOT i18n AUDIT REPORT');
  console.log(`  ${new Date().toISOString().slice(0, 10)}`);
  console.log(HEADER);
  console.log();
  console.log(`  Defined keys (en) : ${enKeys.length}`);
  console.log(`  Used keys         : ${usedKeys.length}`);
  console.log(`  Unused keys       : ${unusedKeys.length}`);
  console.log(`  Missing keys      : ${missingKeys.length}`);
  console.log();

  console.log(SEP);
  console.log('  UNUSED KEYS (defined but never referenced)');
  console.log(SEP);
  if (unusedKeys.length === 0) {
    console.log('  (none — all keys are referenced!)');
  } else {
    for (const k of unusedKeys) console.log(`    - ${k}`);
  }
  console.log();

  console.log(SEP);
  console.log('  MISSING KEYS (referenced in code but not defined in translations)');
  console.log(SEP);
  if (missingKeys.length === 0) {
    console.log('  (none)');
  } else {
    for (const k of missingKeys) {
      const locations = usageMap.get(k) ?? [];
      console.log(`    - ${k}`);
      for (const { file, lines } of locations) {
        console.log(`        ${file}:${lines.join(',')}`);
      }
    }
  }
  console.log();

  console.log(SEP);
  console.log(`  TOP ${TOP_N} MOST-USED KEYS (by file count)`);
  console.log(SEP);
  console.log();

  const topKeys = ranked.slice(0, TOP_N);
  if (topKeys.length > 0) {
    const maxLen = Math.max(...topKeys.map((r) => r.key.length));
    for (const { key, fileCount, totalOccurrences } of topKeys) {
      const bar = '█'.repeat(fileCount);
      console.log(
        `  ${key.padEnd(maxLen)}  ${String(fileCount).padStart(2)} file(s)  ${String(totalOccurrences).padStart(2)} ref(s)  ${bar}`
      );
    }
  }
  console.log();

  if (!SUMMARY) {
    console.log(SEP);
    console.log('  FULL USAGE MAP');
    console.log(SEP);

    for (const { key, fileCount, totalOccurrences, entries } of ranked) {
      console.log();
      console.log(`  ${key}  [${fileCount} file(s), ${totalOccurrences} ref(s)]`);
      for (const { file, lines } of entries) {
        console.log(`    ${file}:${lines.join(',')}`);
      }
    }
  }

  console.log();
  console.log(SEP);
  console.log('  PARITY CHECK (en ↔ es)');
  console.log(SEP);
  console.log();

  for (const [lang, keys] of keysByLang) {
    console.log(`  ${lang} : ${keys.length} keys`);
  }
  console.log();

  if (parityIssues.length === 0) {
    console.log('  All languages define the exact same keys.');
  } else {
    for (const { langA, langB, onlyInA, onlyInB } of parityIssues) {
      if (onlyInA.length > 0) {
        console.log(`  Keys in ${langA} but MISSING from ${langB} (${onlyInA.length}):`);
        for (const k of onlyInA) console.log(`    + ${k}`);
        console.log();
      }
      if (onlyInB.length > 0) {
        console.log(`  Keys in ${langB} but MISSING from ${langA} (${onlyInB.length}):`);
        for (const k of onlyInB) console.log(`    + ${k}`);
        console.log();
      }
    }
  }

  console.log();
  console.log(HEADER);
  console.log('  END OF REPORT');
  console.log(HEADER);
  console.log();

  if (CI_MODE && (unusedKeys.length > 0 || missingKeys.length > 0 || parityIssues.length > 0)) {
    process.exit(1);
  }
}

run();
