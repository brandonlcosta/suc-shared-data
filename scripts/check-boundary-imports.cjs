#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);

const rules = [
  {
    id: 'cross-repo-relative-import',
    regex: /(?:from\s+|import\s*\(|require\s*\()\s*['"`](?:\.\.\/)+suc-[^'"`]+['"`]/g,
    message: 'Cross-repo relative import is forbidden.'
  },
  {
    id: 'deep-suc-traversal',
    regex: /\.\.\/\.\.\/\.\.\/\.\.\/suc-[a-z0-9-]+/g,
    message: 'Deep sibling traversal into another repo is forbidden.'
  },
  {
    id: 'cross-repo-src-reference',
    regex: /(?:from\s+|import\s*\(|require\s*\()\s*['"`][^'"`]*suc-[^'"`]*\/src\//g,
    message: 'Direct imports from another repo src/ are forbidden.'
  }
];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!TARGET_EXT.has(path.extname(entry.name))) continue;
    out.push(full);
  }
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const files = [];
walk(ROOT, files);
const violations = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    let match = rule.regex.exec(content);
    while (match) {
      const line = lineNumberAt(content, match.index);
      violations.push({
        file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
        line,
        rule: rule.id,
        message: rule.message,
        snippet: match[0]
      });
      match = rule.regex.exec(content);
    }
  }
}

if (violations.length > 0) {
  console.error('[boundary-lint] violations found:');
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} [${v.rule}] ${v.message}`);
    console.error(`  ${v.snippet}`);
  }
  process.exit(1);
}

console.log(`[boundary-lint] OK (${files.length} files scanned)`);
