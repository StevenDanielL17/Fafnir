/**
 * SELF-UPGRADE RUNNER
 * 
 * Meta-testing: The test suite tests itself.
 * 
 * This script:
 * 1. Scans the main backend codebase for all source files
 * 2. Scans the test codebase for all test files
 * 3. Identifies coverage gaps (source files without tests)
 * 4. Checks that financial functions have financial tests
 * 5. Reports drift and optionally generates skeleton tests
 * 
 * Run: npm run test:upgrade
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const TESTS_DIR = path.resolve(__dirname, '..');

// ═══════════════════════════════════════════════════════
//  SCANNER
// ═══════════════════════════════════════════════════════

function scanDir(dir, extensions = ['.js']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...scanDir(fullPath, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function scanForExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports = [];

  // Match module.exports = { ... }
  const moduleExportsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (moduleExportsMatch) {
    const items = moduleExportsMatch[1].split(',').map((s) => s.trim().split(':')[0].trim());
    exports.push(...items.filter(Boolean));
  }

  // Match individual exports
  const individualExports = content.matchAll(/exports\.(\w+)/g);
  for (const match of individualExports) {
    exports.push(match[1]);
  }

  return exports;
}

function scanForFinancialFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const financial = [];

  // Functions that move money
  if (content.includes('transferHbar') || content.includes('TransferTransaction')) {
    financial.push('transferHbar');
  }
  if (content.includes('submitLog') || content.includes('TopicMessageSubmit')) {
    financial.push('submitLog');
  }
  if (content.includes('createAccount') || content.includes('AccountCreateTransaction')) {
    financial.push('createAccount');
  }
  if (content.includes('getBalance') || content.includes('AccountBalanceQuery')) {
    financial.push('getBalance');
  }

  return financial;
}

// ═══════════════════════════════════════════════════════
//  ANALYSIS
// ═══════════════════════════════════════════════════════

function analyze() {
  console.log('═══════════════════════════════════════════');
  console.log('  🔍 FAFNIR TEST SELF-UPGRADE ANALYSIS');
  console.log('═══════════════════════════════════════════\n');

  // 1. Find all source files
  const sourceFiles = scanDir(BACKEND_DIR)
    .filter((f) => !f.includes('node_modules') && !f.includes('scripts'))
    .map((f) => path.relative(BACKEND_DIR, f));

  console.log(`📁 Backend source files: ${sourceFiles.length}`);
  sourceFiles.forEach((f) => console.log(`   ${f}`));

  // 2. Find all test files
  const testFiles = scanDir(TESTS_DIR, ['.test.js'])
    .map((f) => path.relative(TESTS_DIR, f));

  console.log(`\n🧪 Test files: ${testFiles.length}`);
  testFiles.forEach((f) => console.log(`   ${f}`));

  // 3. Check coverage mapping
  console.log('\n── Coverage Mapping ──────────────────────');
  const gaps = [];

  for (const source of sourceFiles) {
    const baseName = path.basename(source, '.js');
    const hasTest = testFiles.some((t) => t.includes(baseName));

    if (hasTest) {
      console.log(`   ✓ ${source} → tested`);
    } else {
      console.log(`   ✗ ${source} → NO TEST FILE`);
      gaps.push(source);
    }
  }

  // 4. Check financial functions have financial tests
  console.log('\n── Financial Function Coverage ───────────');
  const financialTestFiles = testFiles.filter((f) => f.startsWith('financial/'));

  for (const source of sourceFiles) {
    const fullPath = path.join(BACKEND_DIR, source);
    const financialFns = scanForFinancialFunctions(fullPath);

    if (financialFns.length > 0) {
      console.log(`   💰 ${source}: ${financialFns.join(', ')}`);
      if (financialTestFiles.length === 0) {
        console.log(`      ⚠ NO financial tests exist!`);
      }
    }
  }

  // 5. Summary
  console.log('\n── Summary ──────────────────────────────');
  console.log(`   Source files:     ${sourceFiles.length}`);
  console.log(`   Test files:       ${testFiles.length}`);
  console.log(`   Coverage gaps:    ${gaps.length}`);
  console.log(`   Financial tests:  ${financialTestFiles.length}`);

  if (gaps.length > 0) {
    console.log('\n⚠ COVERAGE GAPS DETECTED:');
    gaps.forEach((g) => console.log(`   - ${g}`));
    console.log('\n   Run with --generate to create skeleton test files.');
  } else {
    console.log('\n✅ All source files have corresponding tests!');
  }

  console.log('\n═══════════════════════════════════════════\n');

  // 6. Generate skeletons if requested
  if (process.argv.includes('--generate')) {
    generateSkeletons(gaps);
  }

  return { sourceFiles, testFiles, gaps };
}

// ═══════════════════════════════════════════════════════
//  SKELETON GENERATOR
// ═══════════════════════════════════════════════════════

function generateSkeletons(gaps) {
  console.log('🔨 Generating skeleton test files...\n');

  for (const gap of gaps) {
    const baseName = path.basename(gap, '.js');
    const dir = path.dirname(gap); // e.g. "services" or "models"
    const testPath = path.join(TESTS_DIR, 'unit', dir, `${baseName}.test.js`);

    if (fs.existsSync(testPath)) {
      console.log(`   ⏭ ${testPath} already exists`);
      continue;
    }

    const exports = scanForExports(path.join(BACKEND_DIR, gap));
    const skeleton = generateTestSkeleton(baseName, dir, exports);

    const testDir = path.dirname(testPath);
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testPath, skeleton);
    console.log(`   ✓ Created ${path.relative(TESTS_DIR, testPath)}`);
  }
}

function generateTestSkeleton(name, dir, exports) {
  const tests = exports.map((fn) => `
  describe('${fn}()', () => {
    it.todo('should work correctly');
  });`).join('\n');

  return `/**
 * AUTO-GENERATED TEST SKELETON
 * Generated by self-upgrade runner.
 * Fill in the .todo() tests with real assertions.
 * 
 * Source: backend/${dir}/${name}.js
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('${name}', () => {${tests}
});
`;
}

// ═══════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════

analyze();
