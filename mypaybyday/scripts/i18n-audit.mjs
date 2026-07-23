#!/usr/bin/env node

/**
 * Backend i18n Audit Script
 * =========================
 * Analyzes the Quarkus backend translation files (messages_en.properties /
 * messages_es.properties) and the MsgKey enum against actual usage in Java
 * source code.
 *
 * Report sections:
 *   1. Unused property keys  — in .properties but never referenced
 *   2. Unused MsgKey entries — in the enum but never used in services
 *   3. Orphan properties     — in .properties but missing from MsgKey (and not
 *                              used as raw strings either)
 *   4. Most-used MsgKeys     — ranked by reference count across Java files
 *   5. Parity check          — ensures en and es define the same keys
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 *
 * PHASE 1 - Parse .properties files
 *   Reads each messages_<lang>.properties, strips comments and blank lines,
 *   handles backslash line continuations, and extracts the key from each entry.
 *
 * PHASE 2 - Parse MsgKey.java
 *   Extracts every enum constant and its associated property key string from
 *   the MsgKey enum source file.
 *
 * PHASE 3 - Scan Java source for usages
 *   Searches all .java files under src/main/java (excluding the i18n package
 *   itself) for:
 *     a) MsgKey references:  MsgKey.SOME_CONSTANT
 *     b) Raw string keys:    "error.some.key" or "file.some.key" passed to
 *        BusinessException or similar
 *
 * PHASE 4 - Cross-reference & report
 *   Compares all three data sources to find unused keys, orphan properties,
 *   and the most-referenced MsgKeys.
 *
 * PHASE 5 - Parity check (en ↔ es)
 *   Compares the key sets of all language files.
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
  Backend i18n Audit Script
  ─────────────────────────
  Analyzes .properties files, the MsgKey enum, and Java source usage.

  Usage:
    node scripts/i18n-audit.mjs [options]

  Options:
    --top <n>       Number of most-used MsgKeys to show (default: 15)
    --summary       Compact output: skip the full usage map
    --json          Output raw JSON instead of the formatted report
    --ci            Exit with code 1 if unused keys or parity issues are found
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
const SRC = join(ROOT, 'src', 'main');
const JAVA_SRC = join(SRC, 'java');
const I18N_DIR = join(SRC, 'resources', 'i18n');
const MSG_KEY_FILE = join(JAVA_SRC, 'com', 'mypaybyday', 'i18n', 'MsgKey.java');

const ALL_LANGS = ['en', 'es'];

// ── Phase 1: Parse .properties files ──────────────────────────────────────────

function parseProperties(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const keys = [];

  let continued = '';
  for (const line of lines) {
    const trimmed = (continued + line).trim();

    // Skip comments and blank lines (only when not in a continuation)
    if (!continued && (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('!'))) {
      continue;
    }

    // Handle backslash line continuation
    if (trimmed.endsWith('\\')) {
      continued = trimmed.slice(0, -1);
      continue;
    }
    continued = '';

    // Extract key (everything before first = or :)
    const match = trimmed.match(/^([^=:]+?)\s*[=:]/);
    if (match) {
      keys.push(match[1].trim());
    }
  }
  return [...new Set(keys)];
}

// ── Phase 2: Parse MsgKey.java ────────────────────────────────────────────────

function extractEnumConstantList(code) {
  const enumDeclarationStart = code.search(/\benum\s+MsgKey\s*\{/);
  if (enumDeclarationStart === -1) return '';

  const bodyStart = code.indexOf('{', enumDeclarationStart) + 1;
  const constantListEnd = code.indexOf(';', bodyStart);
  return code.slice(bodyStart, constantListEnd === -1 ? undefined : constantListEnd);
}

function parseMsgKeyEnum(filePath) {
  const code = readFileSync(filePath, 'utf-8');
  /** @type {Map<string, string>} enumName → propertyKey */
  const entries = new Map();

  const constantDeclarationRe = /\b([A-Z][A-Z0-9_]*)\s*\(\s*"([^"]+)"\s*\)/g;
  for (const m of extractEnumConstantList(code).matchAll(constantDeclarationRe)) {
    entries.set(m[1], m[2]);
  }
  return entries;
}

// ── Phase 3: Scan Java source files ───────────────────────────────────────────

function walkDir(dir, extensions, skipDirs = []) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      results.push(...walkDir(fullPath, extensions, skipDirs));
    } else if (extensions.includes(extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function scanJavaFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  /** @type {Map<string, number[]>} MsgKey enum name → line numbers */
  const msgKeyRefs = new Map();
  /** @type {Map<string, number[]>} raw property key string → line numbers */
  const rawKeyRefs = new Map();

  // MsgKey.SOME_CONSTANT
  const enumRe = /MsgKey\.(\w+)/g;
  // Raw string keys: "error.xxx.yyy" or "file.xxx.yyy" inside quotes
  const rawRe = /["']((error|file|ai)\.[a-z0-9_.]+)["']/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    for (const m of line.matchAll(enumRe)) {
      const name = m[1];
      if (!msgKeyRefs.has(name)) msgKeyRefs.set(name, []);
      msgKeyRefs.get(name).push(lineNo);
    }

    for (const m of line.matchAll(rawRe)) {
      const key = m[1];
      if (!rawKeyRefs.has(key)) rawKeyRefs.set(key, []);
      rawKeyRefs.get(key).push(lineNo);
    }
  }

  return { msgKeyRefs, rawKeyRefs };
}

// ── Phase 4 & 5: Cross-reference & report ─────────────────────────────────────

function run() {
  // 1. Parse all property files
  const propsByLang = new Map();
  for (const lang of ALL_LANGS) {
    const filePath = join(I18N_DIR, `messages_${lang}.properties`);
    propsByLang.set(lang, parseProperties(filePath));
  }
  const enKeys = propsByLang.get('en');

  // 2. Parse MsgKey enum
  const msgKeyEnum = parseMsgKeyEnum(MSG_KEY_FILE);
  // Reverse map: propertyKey → enumName
  const propKeyToEnum = new Map();
  for (const [enumName, propKey] of msgKeyEnum) {
    propKeyToEnum.set(propKey, enumName);
  }

  // 3. Scan Java source
  const javaFiles = walkDir(JAVA_SRC, ['.java'], ['i18n']);

  /** MsgKey enum name → [ { file, lines } ] */
  const enumUsageMap = new Map();
  /** Raw property key → [ { file, lines } ] */
  const rawUsageMap = new Map();

  for (const file of javaFiles) {
    const { msgKeyRefs, rawKeyRefs } = scanJavaFile(file);
    const relPath = relative(ROOT, file);

    for (const [name, lines] of msgKeyRefs) {
      if (!enumUsageMap.has(name)) enumUsageMap.set(name, []);
      enumUsageMap.get(name).push({ file: relPath, lines });
    }

    for (const [key, lines] of rawKeyRefs) {
      if (!rawUsageMap.has(key)) rawUsageMap.set(key, []);
      rawUsageMap.get(key).push({ file: relPath, lines });
    }
  }

  // 4. Determine status for each property key
  //    A property key is "used" if:
  //    - It has a MsgKey enum entry AND that enum is referenced in code, OR
  //    - It's used as a raw string in code
  function isPropertyKeyUsed(propKey) {
    // Used via MsgKey enum?
    const enumName = propKeyToEnum.get(propKey);
    if (enumName && enumUsageMap.has(enumName)) return true;
    // Used as raw string?
    if (rawUsageMap.has(propKey)) return true;
    return false;
  }

  const unusedPropKeys = enKeys.filter((k) => !isPropertyKeyUsed(k));

  // Unused MsgKey enum entries (defined in enum but never referenced)
  const unusedEnumEntries = [...msgKeyEnum.entries()]
    .filter(([enumName]) => !enumUsageMap.has(enumName))
    .map(([enumName, propKey]) => ({ enumName, propKey }));

  // Orphan properties: in .properties but not in MsgKey AND not used as raw strings
  const orphanProps = enKeys.filter((k) => !propKeyToEnum.has(k) && !rawUsageMap.has(k));

  // 5. Build ranking of most-used MsgKeys
  const ranked = [...msgKeyEnum.entries()]
    .map(([enumName, propKey]) => {
      const entries = enumUsageMap.get(enumName) ?? [];
      const fileCount = entries.length;
      const totalOccurrences = entries.reduce((sum, e) => sum + e.lines.length, 0);
      return { enumName, propKey, fileCount, totalOccurrences, entries };
    })
    .filter((r) => r.fileCount > 0)
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences || b.fileCount - a.fileCount);

  // Also rank raw key usages
  const rawRanked = [...rawUsageMap.entries()]
    .map(([key, entries]) => {
      const fileCount = entries.length;
      const totalOccurrences = entries.reduce((sum, e) => sum + e.lines.length, 0);
      return { key, fileCount, totalOccurrences, entries };
    })
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  // 6. Parity check
  const parityIssues = [];
  for (let i = 0; i < ALL_LANGS.length; i++) {
    for (let j = i + 1; j < ALL_LANGS.length; j++) {
      const langA = ALL_LANGS[i];
      const langB = ALL_LANGS[j];
      const keysA = new Set(propsByLang.get(langA));
      const keysB = new Set(propsByLang.get(langB));
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
      totalPropertyKeys: enKeys.length,
      totalMsgKeyEntries: msgKeyEnum.size,
      unusedPropertyKeys: unusedPropKeys,
      unusedMsgKeyEntries: unusedEnumEntries,
      orphanProperties: orphanProps,
      ranking: ranked.map(({ enumName, propKey, fileCount, totalOccurrences, entries }) => ({
        enumName,
        propKey,
        fileCount,
        totalOccurrences,
        locations: entries.map((e) => ({ file: e.file, lines: e.lines })),
      })),
      rawStringUsage: rawRanked.map(({ key, fileCount, totalOccurrences, entries }) => ({
        key,
        fileCount,
        totalOccurrences,
        locations: entries.map((e) => ({ file: e.file, lines: e.lines })),
      })),
      parity: {
        languages: Object.fromEntries([...propsByLang].map(([l, keys]) => [l, keys.length])),
        inSync: parityIssues.length === 0,
        issues: parityIssues.map(({ langA, langB, onlyInA, onlyInB }) => ({
          pair: `${langA} ↔ ${langB}`,
          onlyIn: { [langA]: onlyInA, [langB]: onlyInB },
        })),
      },
    };
    console.log(JSON.stringify(report, null, 2));
    if (CI_MODE && (unusedPropKeys.length > 0 || unusedEnumEntries.length > 0 || orphanProps.length > 0 || parityIssues.length > 0)) {
      process.exit(1);
    }
    return;
  }

  // ── Pretty report ───────────────────────────────────────────────────────

  const SEP = '─'.repeat(78);
  const HEADER = '═'.repeat(78);

  console.log();
  console.log(HEADER);
  console.log('  BACKEND i18n AUDIT REPORT');
  console.log(`  ${new Date().toISOString().slice(0, 10)}`);
  console.log(HEADER);
  console.log();
  console.log(`  Property keys (en) : ${enKeys.length}`);
  console.log(`  MsgKey enum entries : ${msgKeyEnum.size}`);
  console.log(`  Unused prop keys   : ${unusedPropKeys.length}`);
  console.log(`  Unused enum entries : ${unusedEnumEntries.length}`);
  console.log(`  Orphan properties  : ${orphanProps.length}`);
  console.log();

  // ── Unused property keys ────────────────────────────────────────────────

  console.log(SEP);
  console.log('  UNUSED PROPERTY KEYS (in .properties but never referenced)');
  console.log(SEP);

  if (unusedPropKeys.length === 0) {
    console.log('  (none)');
  } else {
    for (const k of unusedPropKeys) {
      const inEnum = propKeyToEnum.has(k) ? ` [MsgKey.${propKeyToEnum.get(k)}]` : ' [no MsgKey]';
      console.log(`    - ${k}${inEnum}`);
    }
  }
  console.log();

  // ── Unused MsgKey entries ───────────────────────────────────────────────

  console.log(SEP);
  console.log('  UNUSED MSGKEY ENTRIES (in enum but never referenced in code)');
  console.log(SEP);

  if (unusedEnumEntries.length === 0) {
    console.log('  (none)');
  } else {
    for (const { enumName, propKey } of unusedEnumEntries) {
      console.log(`    - MsgKey.${enumName}  →  ${propKey}`);
    }
  }
  console.log();

  // ── Orphan properties ───────────────────────────────────────────────────

  console.log(SEP);
  console.log('  ORPHAN PROPERTIES (in .properties but missing from MsgKey enum)');
  console.log(SEP);

  if (orphanProps.length === 0) {
    console.log('  (none)');
  } else {
    for (const k of orphanProps) {
      console.log(`    - ${k}`);
    }
  }
  console.log();

  // ── Top-N most used MsgKeys ─────────────────────────────────────────────

  console.log(SEP);
  console.log(`  TOP ${TOP_N} MOST-USED MSGKEYS (by reference count)`);
  console.log(SEP);
  console.log();

  const topKeys = ranked.slice(0, TOP_N);
  if (topKeys.length > 0) {
    const maxLen = Math.max(...topKeys.map((r) => r.enumName.length));
    for (const { enumName, fileCount, totalOccurrences } of topKeys) {
      const bar = '█'.repeat(totalOccurrences);
      console.log(
        `  ${enumName.padEnd(maxLen)}  ${String(fileCount).padStart(2)} file(s)  ${String(totalOccurrences).padStart(2)} ref(s)  ${bar}`
      );
    }
  }
  console.log();

  // ── Raw string key usage ────────────────────────────────────────────────

  if (rawRanked.length > 0) {
    console.log(SEP);
    console.log('  RAW STRING KEY USAGE (keys used without MsgKey enum)');
    console.log(SEP);
    console.log();

    const maxLen = Math.max(...rawRanked.map((r) => r.key.length));
    for (const { key, fileCount, totalOccurrences } of rawRanked) {
      const bar = '█'.repeat(totalOccurrences);
      console.log(
        `  ${key.padEnd(maxLen)}  ${String(fileCount).padStart(2)} file(s)  ${String(totalOccurrences).padStart(2)} ref(s)  ${bar}`
      );
    }
    console.log();
  }

  // ── Full usage map (skipped in --summary mode) ──────────────────────────

  if (!SUMMARY) {
    console.log(SEP);
    console.log('  FULL USAGE MAP');
    console.log(SEP);

    for (const { enumName, propKey, fileCount, totalOccurrences, entries } of ranked) {
      console.log();
      console.log(`  MsgKey.${enumName}  →  ${propKey}  [${fileCount} file(s), ${totalOccurrences} ref(s)]`);
      for (const { file, lines } of entries) {
        console.log(`    ${file}:${lines.join(',')}`);
      }
    }

    if (rawRanked.length > 0) {
      console.log();
      console.log('  ── Raw string keys ──');
      for (const { key, entries } of rawRanked) {
        console.log();
        console.log(`  "${key}"  [${entries.length} file(s)]`);
        for (const { file, lines } of entries) {
          console.log(`    ${file}:${lines.join(',')}`);
        }
      }
    }
  }

  // ── Parity check ────────────────────────────────────────────────────────

  console.log();
  console.log(SEP);
  console.log('  PARITY CHECK (en ↔ es)');
  console.log(SEP);
  console.log();

  for (const [lang, keys] of propsByLang) {
    console.log(`  messages_${lang}.properties : ${keys.length} keys`);
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

  // ── CI exit code ──────────────────────────────────────────────────────

  if (CI_MODE && (unusedPropKeys.length > 0 || unusedEnumEntries.length > 0 || orphanProps.length > 0 || parityIssues.length > 0)) {
    process.exit(1);
  }
}

run();
