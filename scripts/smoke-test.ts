#!/usr/bin/env npx tsx
/**
 * Smoke Test Script for Samurai Insurance
 *
 * Run against production:
 *   PROD_URL=https://your-backend-url.run.app npx tsx scripts/smoke-test.ts
 *
 * Or against local:
 *   npx tsx scripts/smoke-test.ts
 */

const PROD_URL = process.env.PROD_URL || 'http://localhost:8080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAX_RESPONSE_TIME_MS = 2000;

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  statusCode?: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ statusCode: number; body: unknown }>
): Promise<boolean> {
  const start = performance.now();

  try {
    const { statusCode, body } = await testFn();
    const durationMs = Math.round(performance.now() - start);

    // Check status code
    if (statusCode !== 200) {
      results.push({
        name,
        passed: false,
        durationMs,
        statusCode,
        error: `Expected status 200, got ${statusCode}`,
      });
      console.log(`\x1b[31m  [FAIL]\x1b[0m ${name}`);
      console.log(`         Status: ${statusCode}`);
      console.log(`         Duration: ${durationMs}ms`);
      return false;
    }

    // Check response time
    if (durationMs > MAX_RESPONSE_TIME_MS) {
      results.push({
        name,
        passed: false,
        durationMs,
        statusCode,
        error: `Response time ${durationMs}ms exceeds ${MAX_RESPONSE_TIME_MS}ms threshold`,
      });
      console.log(`\x1b[31m  [FAIL]\x1b[0m ${name}`);
      console.log(`         Duration: ${durationMs}ms (exceeded ${MAX_RESPONSE_TIME_MS}ms threshold)`);
      return false;
    }

    results.push({ name, passed: true, durationMs, statusCode });
    console.log(`\x1b[32m  [PASS]\x1b[0m ${name} (${durationMs}ms)`);
    return true;

  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const errorMsg = err instanceof Error ? err.message : String(err);

    results.push({
      name,
      passed: false,
      durationMs,
      error: errorMsg,
    });
    console.log(`\x1b[31m  [FAIL]\x1b[0m ${name}`);
    console.log(`         Error: ${errorMsg}`);
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ===========================================
// TEST 1: Backend Health Check
// ===========================================
async function testBackendHealth(): Promise<{ statusCode: number; body: unknown }> {
  const response = await fetchWithTimeout(`${PROD_URL}/`);
  const body = await response.text();
  return { statusCode: response.status, body };
}

// ===========================================
// TEST 2: Public API Endpoint (Supabase connectivity)
// ===========================================
async function testPublicApiEndpoint(): Promise<{ statusCode: number; body: unknown }> {
  // /api/policy-status is a public endpoint that queries the backend state
  const response = await fetchWithTimeout(`${PROD_URL}/api/policy-status`);
  const body = await response.json();
  return { statusCode: response.status, body };
}

// ===========================================
// TEST 3: Frontend Homepage (if FRONTEND_URL provided)
// ===========================================
async function testFrontendHomepage(): Promise<{ statusCode: number; body: unknown }> {
  const response = await fetchWithTimeout(`${FRONTEND_URL}/`);
  const body = await response.text();

  // Verify it's actually our app (contains expected content)
  if (!body.includes('Samurai') && !body.includes('samurai')) {
    throw new Error('Homepage does not contain expected content');
  }

  return { statusCode: response.status, body: '[HTML content]' };
}

// ===========================================
// MAIN
// ===========================================
async function main() {
  console.log('\n========================================');
  console.log('  SAMURAI INSURANCE - SMOKE TEST');
  console.log('========================================');
  console.log(`  Backend URL:  ${PROD_URL}`);
  console.log(`  Frontend URL: ${FRONTEND_URL}`);
  console.log(`  Max Response Time: ${MAX_RESPONSE_TIME_MS}ms`);
  console.log('----------------------------------------\n');

  let allPassed = true;

  // Test 1: Backend Health
  console.log('1. Backend Health Check');
  if (!(await runTest('GET / - Backend Health', testBackendHealth))) {
    allPassed = false;
  }

  // Test 2: Public API (Supabase connectivity)
  console.log('\n2. Public API Endpoint (Backend State)');
  if (!(await runTest('GET /api/policy-status', testPublicApiEndpoint))) {
    allPassed = false;
  }

  // Test 3: Frontend (only if different from backend or explicitly set)
  if (process.env.FRONTEND_URL) {
    console.log('\n3. Frontend Homepage');
    if (!(await runTest('GET / - Frontend Homepage', testFrontendHomepage))) {
      allPassed = false;
    }
  }

  // Summary
  console.log('\n----------------------------------------');
  console.log('  SUMMARY');
  console.log('----------------------------------------');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);

  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`    - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n========================================\n');

  if (!allPassed) {
    console.log('\x1b[31mSMOKE TEST FAILED\x1b[0m\n');
    process.exit(1);
  }

  console.log('\x1b[32mSMOKE TEST PASSED\x1b[0m\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\x1b[31mFatal error running smoke test:\x1b[0m', err);
  process.exit(1);
});
