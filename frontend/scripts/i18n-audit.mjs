#!/usr/bin/env node

/**
 * i18n Audit Script
 * =================
 * Analyzes translation files (en.ts / es.ts) against actual usage in the
 * frontend source code and produces a report with:
 *
 *   1. Unused keys       — defined in the translation files but never referenced
 *   2. Most-used keys    — ranked by number of files that reference them
 *   3. Usage map         — every key with the files + line numbers where it appears
 *   4. Parity check      — ensures en.ts and es.ts define the exact same keys
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 *
 * PHASE 1 - Extract defined keys
 *   Reads the translation TS file, strips the `as const` / `export default`,
 *   evaluates it as a plain JS object, then recursively flattens nested keys
 *   into dot-notation strings  (e.g. { common: { save: '...' } } → "common.save").
 *
 * PHASE 2 - Scan source files for usages
 *   Globs all .ts / .tsx files under src/ (excluding i18n/ and node_modules/).
 *   For each file it collects:
 *     a) Static keys:   t('key')  t("key")
 *     b) Dynamic keys:  t(`prefix.${expr}`)  → marks the whole "prefix.*" group as used
 *     c) Indirect keys:  labelKey: 'some.key'  (common pattern in this project)
 *
 * PHASE 3 - Cross-reference & report
 *   Compares defined keys vs. found usages and prints the report.
 *
 * PHASE 4 - Parity check (en ↔ es)
 *   Parses both translation files independently and compares their key sets.
 *   Reports keys that exist in one language but are missing from the other.
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
  i18n Audit Script
  ─────────────────
  Analyzes translation files against source code usage and checks
  parity between languages.

  Usage:
    node scripts/i18n-audit.mjs [options]

  Options:
    --lang <code>   Language file to audit (default: en)
    --top <n>       Number of most-used keys to show (default: 15)
    --summary       Compact output: stats, unused keys, top-N, and parity only
    --json          Output raw JSON instead of the formatted report
    --ci            Exit with code 1 if unused keys or parity issues are found
    -h, --help      Show this help message

  Examples:
    node scripts/i18n-audit.mjs                  # audit en.ts
    node scripts/i18n-audit.mjs --lang es         # audit es.ts
    node scripts/i18n-audit.mjs --top 20          # show top-20 most used
    node scripts/i18n-audit.mjs --json            # machine-readable output
    node scripts/i18n-audit.mjs --json | jq .parity   # just the parity check
`);
  process.exit(0);
}

const LANG = flag('lang', 'en');
const TOP_N = Number(flag('top', '15'));
const JSON_OUT = args.includes('--json');
const SUMMARY = args.includes('--summary');
const CI_MODE = args.includes('--ci');

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(ROOT, 'src');
const I18N_FILE = join(SRC, 'lib', 'i18n', `${LANG}.ts`);

// ── Phase 1: Extract defined keys ─────────────────────────────────────────────

function parseTranslationFile(filePath) {
  let code = readFileSync(filePath, 'utf-8');

  // Strip TS-specific syntax so we can eval as JS
  code = code.replace(/\bas\s+const\b/g, '');
  code = code.replace(/^export\s+default\s+\w+;\s*$/m, '');

  // Replace `const xx = {` with `return {`
  code = code.replace(/^const\s+\w+\s*=\s*\{/m, 'return {');

  // Wrap in a function and evaluate
  const fn = new Function(code);
  return fn();
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ── Phase 2: Scan source files ────────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip i18n dir and node_modules
      if (entry.name === 'i18n' || entry.name === 'node_modules') continue;
      results.push(...walkDir(fullPath, extensions));
    } else if (extensions.includes(extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * For each source file, extract:
 *   - static keys:    t('foo.bar')  t("foo.bar")
 *   - indirect keys:  labelKey: 'foo.bar'  (or Key: / key:)
 *   - dynamic groups: t(`foo.${x}`) → "foo.*"
 */
function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  /** @type {Map<string, number[]>} key → line numbers */
  const staticKeys = new Map();
  /** @type {Set<string>} prefixes from dynamic t(`prefix.${...}`) */
  const dynamicPrefixes = new Set();

  // Patterns
  const staticRe = /\bt\(\s*['"]([a-zA-Z_][\w]*(?:\.\w+)+)['"]/g;
  const dynamicRe = /\bt\(\s*`([a-zA-Z_][\w]*(?:\.\w+)*)\.\$\{/g;
  const indirectRe = /[Kk]ey['"]*\s*[:=]\s*['"]([a-zA-Z_][\w]*(?:\.\w+)+)['"]/g;
  // Ternary inside t():  t(cond ? 'key.a' : 'key.b')
  const ternaryRe = /\bt\(\s*[^)]*\?\s*['"]([a-zA-Z_][\w]*(?:\.\w+)+)['"]\s*:\s*['"]([a-zA-Z_][\w]*(?:\.\w+)+)['"]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Static t('key')
    for (const m of line.matchAll(staticRe)) {
      const key = m[1];
      if (!staticKeys.has(key)) staticKeys.set(key, []);
      staticKeys.get(key).push(lineNo);
    }

    // Dynamic t(`prefix.${var}`)
    for (const m of line.matchAll(dynamicRe)) {
      dynamicPrefixes.add(m[1]);
    }

    // Indirect: labelKey: 'some.key'
    for (const m of line.matchAll(indirectRe)) {
      const key = m[1];
      if (!staticKeys.has(key)) staticKeys.set(key, []);
      staticKeys.get(key).push(lineNo);
    }

    // Ternary inside t():  t(cond ? 'key.a' : 'key.b')
    for (const m of line.matchAll(ternaryRe)) {
      for (const key of [m[1], m[2]]) {
        if (!staticKeys.has(key)) staticKeys.set(key, []);
        staticKeys.get(key).push(lineNo);
      }
    }
  }

  return { staticKeys, dynamicPrefixes };
}

// ── Phase 3: Cross-reference ──────────────────────────────────────────────────

// ── Phase 4: Parity check ─────────────────────────────────────────────────────

const ALL_LANGS = ['en', 'es'];

function parityCheck() {
  /** @type {Map<string, Set<string>>} lang → set of keys */
  const keysByLang = new Map();

  for (const lang of ALL_LANGS) {
    const filePath = join(SRC, 'lib', 'i18n', `${lang}.ts`);
    const obj = parseTranslationFile(filePath);
    keysByLang.set(lang, new Set(flattenKeys(obj)));
  }

  // Compare every pair of languages
  const issues = [];

  for (let i = 0; i < ALL_LANGS.length; i++) {
    for (let j = i + 1; j < ALL_LANGS.length; j++) {
      const langA = ALL_LANGS[i];
      const langB = ALL_LANGS[j];
      const keysA = keysByLang.get(langA);
      const keysB = keysByLang.get(langB);

      const onlyInA = [...keysA].filter((k) => !keysB.has(k)).sort();
      const onlyInB = [...keysB].filter((k) => !keysA.has(k)).sort();

      if (onlyInA.length > 0 || onlyInB.length > 0) {
        issues.push({ langA, langB, onlyInA, onlyInB });
      }
    }
  }

  return { keysByLang, issues };
}

function run() {
  // 1. Parse translation file
  const translationObj = parseTranslationFile(I18N_FILE);
  const definedKeys = flattenKeys(translationObj);

  // 2. Scan source files
  const sourceFiles = walkDir(SRC, ['.ts', '.tsx']);

  /**
   * Global usage map: key → [ { file, lines: number[] } ]
   */
  const usageMap = new Map();
  /** Set of dynamic prefixes (e.g. "eventType", "subscriptions.status") */
  const allDynamicPrefixes = new Set();

  for (const file of sourceFiles) {
    const { staticKeys, dynamicPrefixes } = scanFile(file);
    const relPath = relative(ROOT, file);

    for (const [key, lines] of staticKeys) {
      if (!usageMap.has(key)) usageMap.set(key, []);
      usageMap.get(key).push({ file: relPath, lines });
    }

    for (const prefix of dynamicPrefixes) {
      allDynamicPrefixes.add(prefix);
    }
  }

  // 3. Determine which keys are used
  //    A key is "used" if it appears in usageMap OR if it falls under a dynamic prefix
  function isUsed(key) {
    if (usageMap.has(key)) return true;
    for (const prefix of allDynamicPrefixes) {
      if (key.startsWith(prefix + '.')) return true;
    }
    return false;
  }

  const unusedKeys = definedKeys.filter((k) => !isUsed(k));
  const usedKeys = definedKeys.filter((k) => isUsed(k));

  // 4. Build usage count ranking (by number of files, then total occurrences)
  const ranked = usedKeys
    .map((key) => {
      const entries = usageMap.get(key) ?? [];
      const fileCount = entries.length;
      const totalOccurrences = entries.reduce((sum, e) => sum + e.lines.length, 0);
      // Check if it's only covered by a dynamic prefix (no direct references)
      const dynamicOnly = entries.length === 0;
      return { key, fileCount, totalOccurrences, entries, dynamicOnly };
    })
    .sort((a, b) => b.fileCount - a.fileCount || b.totalOccurrences - a.totalOccurrences);

  // ── Output ────────────────────────────────────────────────────────────────

  // 5. Parity check
  const { keysByLang, issues: parityIssues } = parityCheck();

  if (JSON_OUT) {
    const report = {
      lang: LANG,
      totalDefined: definedKeys.length,
      totalUsed: usedKeys.length,
      totalUnused: unusedKeys.length,
      dynamicPrefixes: [...allDynamicPrefixes],
      unused: unusedKeys,
      ranking: ranked.map(({ key, fileCount, totalOccurrences, entries, dynamicOnly }) => ({
        key,
        fileCount,
        totalOccurrences,
        dynamicOnly,
        locations: entries.map((e) => ({ file: e.file, lines: e.lines })),
      })),
      parity: {
        languages: Object.fromEntries([...keysByLang].map(([l, s]) => [l, s.size])),
        inSync: parityIssues.length === 0,
        issues: parityIssues.map(({ langA, langB, onlyInA, onlyInB }) => ({
          pair: `${langA} ↔ ${langB}`,
          onlyIn: {
            [langA]: onlyInA,
            [langB]: onlyInB,
          },
        })),
      },
    };
    console.log(JSON.stringify(report, null, 2));
    if (CI_MODE && (unusedKeys.length > 0 || parityIssues.length > 0)) {
      process.exit(1);
    }
    return;
  }

  // ── Pretty report ───────────────────────────────────────────────────────

  const SEP = '─'.repeat(78);
  const DSEP = '═'.repeat(78);

  console.log();
  console.log(DSEP);
  console.log(`  i18n AUDIT REPORT — ${LANG}.ts`);
  console.log(`  ${new Date().toISOString().slice(0, 10)}`);
  console.log(DSEP);
  console.log();
  console.log(`  Total defined keys : ${definedKeys.length}`);
  console.log(`  Used keys          : ${usedKeys.length}`);
  console.log(`  Unused keys        : ${unusedKeys.length}`);
  console.log(`  Dynamic prefixes   : ${[...allDynamicPrefixes].join(', ') || '(none)'}`);
  console.log();

  // ── Unused keys ─────────────────────────────────────────────────────────

  console.log(SEP);
  console.log('  UNUSED KEYS');
  console.log(SEP);

  if (unusedKeys.length === 0) {
    console.log('  (none — all keys are referenced!)');
  } else {
    // Group by top-level section
    const grouped = {};
    for (const key of unusedKeys) {
      const section = key.split('.')[0];
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(key);
    }
    for (const [section, keys] of Object.entries(grouped)) {
      console.log();
      console.log(`  [${section}]`);
      for (const k of keys) {
        console.log(`    - ${k}`);
      }
    }
  }
  console.log();

  // ── Top-N most used ─────────────────────────────────────────────────────

  console.log(SEP);
  console.log(`  TOP ${TOP_N} MOST-USED KEYS (by file count)`);
  console.log(SEP);
  console.log();

  const topKeys = ranked.slice(0, TOP_N);
  const maxKeyLen = Math.max(...topKeys.map((r) => r.key.length));

  for (const { key, fileCount, totalOccurrences, entries } of topKeys) {
    const bar = '█'.repeat(fileCount);
    console.log(
      `  ${key.padEnd(maxKeyLen)}  ${String(fileCount).padStart(2)} file(s)  ${String(totalOccurrences).padStart(2)} ref(s)  ${bar}`
    );
  }
  console.log();

  // ── Full usage map (skipped in --summary mode) ──────────────────────

  if (!SUMMARY) {
    console.log(SEP);
    console.log('  FULL USAGE MAP');
    console.log(SEP);

    for (const { key, fileCount, totalOccurrences, entries, dynamicOnly } of ranked) {
      console.log();
      const dynTag = dynamicOnly ? ' (dynamic only)' : '';
      console.log(`  ${key}  [${fileCount} file(s), ${totalOccurrences} ref(s)]${dynTag}`);

      if (entries.length > 0) {
        for (const { file, lines } of entries) {
          console.log(`    ${file}:${lines.join(',')}`);
        }
      } else {
        // Covered by dynamic prefix
        const matchingPrefix = [...allDynamicPrefixes].find((p) => key.startsWith(p + '.'));
        console.log(`    (covered by dynamic prefix: ${matchingPrefix}.\${...})`);
      }
    }
  }

  // ── Parity check (en ↔ es) ───────────────────────────────────────────

  console.log();
  console.log(SEP);
  console.log('  PARITY CHECK (en ↔ es)');
  console.log(SEP);
  console.log();

  // Show key counts per language
  for (const [lang, keys] of keysByLang) {
    console.log(`  ${lang}.ts : ${keys.size} keys`);
  }
  console.log();

  if (parityIssues.length === 0) {
    console.log('  All languages define the exact same keys.');
  } else {
    for (const { langA, langB, onlyInA, onlyInB } of parityIssues) {
      if (onlyInA.length > 0) {
        console.log(`  Keys in ${langA}.ts but MISSING from ${langB}.ts (${onlyInA.length}):`);
        for (const k of onlyInA) {
          console.log(`    + ${k}`);
        }
        console.log();
      }
      if (onlyInB.length > 0) {
        console.log(`  Keys in ${langB}.ts but MISSING from ${langA}.ts (${onlyInB.length}):`);
        for (const k of onlyInB) {
          console.log(`    + ${k}`);
        }
        console.log();
      }
    }
  }

  console.log();
  console.log(DSEP);
  console.log('  END OF REPORT');
  console.log(DSEP);
  console.log();

  // ── CI exit code ──────────────────────────────────────────────────────

  if (CI_MODE && (unusedKeys.length > 0 || parityIssues.length > 0)) {
    process.exit(1);
  }
}

run();
