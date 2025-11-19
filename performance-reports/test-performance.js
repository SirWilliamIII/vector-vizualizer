#!/usr/bin/env node

/**
 * Performance Testing Script for Vector Similarity Explorer
 *
 * This script uses Puppeteer to automate performance testing,
 * measuring Core Web Vitals, rendering performance, and runtime metrics.
 *
 * Usage:
 *   npm install puppeteer
 *   node test-performance.js
 *
 * Or with custom URL:
 *   node test-performance.js http://localhost:8000
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  url: process.argv[2] || 'http://localhost:8000',
  outputDir: './performance-reports',
  testDuration: 10000, // 10 seconds per test
  vectorCounts: [10, 20, 50], // Test with different vector counts
  models: ['minilm', 'e5-small', 'bge-small']
};

// Performance budgets
const BUDGETS = {
  ttfb: 200,
  fcp: 800,
  lcp: 2500,
  tti: 3000,
  cls: 0.1,
  fps: 55,
  frameTime: 18,
  inputDelay: 50
};

class PerformanceTester {
  constructor(config) {
    this.config = config;
    this.results = {
      timestamp: new Date().toISOString(),
      url: config.url,
      tests: []
    };

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
  }

  async run() {
    console.log('🚀 Starting Vector Similarity Explorer Performance Tests\n');
    console.log(`URL: ${this.config.url}`);
    console.log(`Duration: ${this.config.testDuration}ms per test\n`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    try {
      // Test 1: Page Load Performance
      await this.testPageLoad(browser);

      // Test 2: Rendering Performance (different vector counts)
      for (const count of this.config.vectorCounts) {
        await this.testRenderingPerformance(browser, count);
      }

      // Test 3: Model Loading Performance
      await this.testModelLoading(browser);

      // Test 4: Interaction Performance
      await this.testInteractionPerformance(browser);

      // Test 5: Memory Usage
      await this.testMemoryUsage(browser);

      // Generate reports
      this.generateReports();

      console.log('\n✅ All performance tests complete!');
      console.log(`\nReports saved to: ${this.config.outputDir}/`);

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await browser.close();
    }
  }

  async testPageLoad(browser) {
    console.log('📄 Testing Page Load Performance...');

    const page = await browser.newPage();

    // Enable performance metrics
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = [];
    });

    // Collect metrics
    const metrics = {};

    // Navigation timing
    await page.goto(this.config.url, { waitUntil: 'networkidle0' });

    const performanceTiming = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        ttfb: perfData.responseStart - perfData.requestStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart
      };
    });

    Object.assign(metrics, performanceTiming);

    // Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = { fcp: null, lcp: null, cls: 0 };

        // FCP
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
        });
        fcpObserver.observe({ type: 'paint', buffered: true });

        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              vitals.cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => resolve(vitals), 2000);
      });
    });

    Object.assign(metrics, webVitals);

    // Resource timing
    const resources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const breakdown = {
        scripts: 0,
        stylesheets: 0,
        images: 0,
        total: 0,
        count: resources.length
      };

      resources.forEach(r => {
        if (r.name.endsWith('.js')) breakdown.scripts += r.duration;
        else if (r.name.endsWith('.css')) breakdown.stylesheets += r.duration;
        else if (r.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) breakdown.images += r.duration;
        breakdown.total += r.duration;
      });

      return breakdown;
    });

    metrics.resources = resources;

    // Check against budgets
    const violations = this.checkBudgets(metrics, BUDGETS);

    this.results.tests.push({
      name: 'Page Load',
      metrics,
      violations,
      passed: violations.length === 0
    });

    // Log results
    console.log(`  TTFB: ${metrics.ttfb.toFixed(2)}ms ${this.getStatusIcon(metrics.ttfb, BUDGETS.ttfb)}`);
    console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms ${this.getStatusIcon(metrics.fcp, BUDGETS.fcp)}`);
    console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms ${this.getStatusIcon(metrics.lcp, BUDGETS.lcp)}`);
    console.log(`  CLS: ${metrics.cls.toFixed(3)} ${this.getStatusIcon(metrics.cls, BUDGETS.cls)}`);
    console.log(`  DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
    console.log(`  Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
    console.log(`  Resources: ${resources.count} files, ${resources.total.toFixed(2)}ms total\n`);

    await page.close();
  }

  async testRenderingPerformance(browser, vectorCount) {
    console.log(`🎬 Testing Rendering Performance (${vectorCount} vectors)...`);

    const page = await browser.newPage();
    await page.goto(this.config.url, { waitUntil: 'networkidle0' });

    // Wait for scene to initialize
    await page.waitForTimeout(2000);

    // Add vectors to test with
    await page.evaluate(async (count) => {
      const words = ['test', 'vector', 'word', 'sample', 'data', 'point', 'example', 'item', 'node', 'element'];

      for (let i = 0; i < count; i++) {
        const word = words[i % words.length] + i;
        const input = document.getElementById('word-input');
        input.value = word;

        // Trigger add
        await window.addCustomVector();

        // Wait a bit between additions
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }, vectorCount);

    // Measure FPS
    const fpsMetrics = await page.evaluate((duration) => {
      return new Promise((resolve) => {
        const frames = [];
        let lastTime = performance.now();
        let frameCount = 0;

        function measureFrame() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          frames.push(delta);
          lastTime = currentTime;
          frameCount++;

          if (currentTime - performance.now() < duration) {
            requestAnimationFrame(measureFrame);
          } else {
            // Calculate statistics
            const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
            const avgFPS = 1000 / avgFrameTime;

            frames.sort((a, b) => a - b);
            const p99 = frames[Math.floor(frames.length * 0.99)];
            const p1 = frames[Math.floor(frames.length * 0.01)];
            const fps1Low = 1000 / p99;

            resolve({
              avgFPS,
              avgFrameTime,
              fps1Low,
              frameCount,
              minFPS: 1000 / p99,
              maxFPS: 1000 / p1
            });
          }
        }

        requestAnimationFrame(measureFrame);
      });
    }, this.config.testDuration);

    // Get Three.js render stats
    const renderStats = await page.evaluate(() => {
      // Access Three.js renderer info if available
      // This would need to be exposed from the application
      return {
        drawCalls: 'N/A',
        triangles: 'N/A',
        geometries: 'N/A',
        textures: 'N/A'
      };
    });

    const metrics = {
      vectorCount,
      ...fpsMetrics,
      ...renderStats
    };

    const violations = this.checkBudgets(metrics, BUDGETS);

    this.results.tests.push({
      name: `Rendering (${vectorCount} vectors)`,
      metrics,
      violations,
      passed: violations.length === 0
    });

    console.log(`  Average FPS: ${metrics.avgFPS.toFixed(1)} ${this.getStatusIcon(metrics.avgFPS, BUDGETS.fps, true)}`);
    console.log(`  1% Low FPS: ${metrics.fps1Low.toFixed(1)}`);
    console.log(`  Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms ${this.getStatusIcon(metrics.avgFrameTime, BUDGETS.frameTime)}`);
    console.log(`  Frames: ${metrics.frameCount}\n`);

    await page.close();
  }

  async testModelLoading(browser) {
    console.log('🤖 Testing ML Model Loading Performance...');

    const page = await browser.newPage();
    await page.goto(this.config.url, { waitUntil: 'networkidle0' });

    const modelMetrics = {};

    for (const model of this.config.models) {
      console.log(`  Loading ${model}...`);

      const startTime = await page.evaluate(() => performance.now());

      // Switch to model (triggers loading)
      await page.select('#model-select', model);

      // Wait for loading to complete
      await page.waitForTimeout(2000);

      const endTime = await page.evaluate(() => performance.now());
      const duration = endTime - startTime;

      modelMetrics[model] = {
        loadTime: duration,
        size: model === 'minilm' ? 50 : model === 'e5-small' ? 133 : 150
      };

      console.log(`    ${duration.toFixed(0)}ms`);
    }

    this.results.tests.push({
      name: 'Model Loading',
      metrics: modelMetrics,
      violations: [],
      passed: true
    });

    console.log();

    await page.close();
  }

  async testInteractionPerformance(browser) {
    console.log('🖱️  Testing Interaction Performance...');

    const page = await browser.newPage();
    await page.goto(this.config.url, { waitUntil: 'networkidle0' });

    // Add some vectors for interaction testing
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        const input = document.getElementById('word-input');
        input.value = 'test' + i;
        await window.addCustomVector();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    // Measure hover interaction
    const hoverMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.querySelector('canvas');
        const times = [];

        let count = 0;
        const maxCount = 50;

        function measureHover() {
          const start = performance.now();

          // Simulate mouse move
          const event = new PointerEvent('pointermove', {
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
          });
          canvas.dispatchEvent(event);

          const duration = performance.now() - start;
          times.push(duration);

          count++;
          if (count < maxCount) {
            setTimeout(measureHover, 50);
          } else {
            times.sort((a, b) => a - b);
            resolve({
              avg: times.reduce((a, b) => a + b, 0) / times.length,
              p95: times[Math.floor(times.length * 0.95)],
              max: times[times.length - 1]
            });
          }
        }

        measureHover();
      });
    });

    const metrics = {
      hover: hoverMetrics
    };

    this.results.tests.push({
      name: 'Interaction',
      metrics,
      violations: [],
      passed: true
    });

    console.log(`  Hover (avg): ${hoverMetrics.avg.toFixed(2)}ms`);
    console.log(`  Hover (P95): ${hoverMetrics.p95.toFixed(2)}ms`);
    console.log(`  Hover (max): ${hoverMetrics.max.toFixed(2)}ms\n`);

    await page.close();
  }

  async testMemoryUsage(browser) {
    console.log('💾 Testing Memory Usage...');

    const page = await browser.newPage();

    // Enable memory tracking
    const client = await page.target().createCDPSession();
    await client.send('Performance.enable');

    await page.goto(this.config.url, { waitUntil: 'networkidle0' });

    // Get baseline memory
    let baseline = await client.send('Performance.getMetrics');
    const baselineHeap = baseline.metrics.find(m => m.name === 'JSHeapUsedSize').value;

    // Add vectors
    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        const input = document.getElementById('word-input');
        input.value = 'memtest' + i;
        await window.addCustomVector();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    // Measure with vectors
    let withVectors = await client.send('Performance.getMetrics');
    const withVectorsHeap = withVectors.metrics.find(m => m.name === 'JSHeapUsedSize').value;

    // Remove vectors
    await page.evaluate(() => {
      window.startFresh();
    });

    await page.waitForTimeout(2000); // Allow GC

    // Measure after removal
    let afterRemoval = await client.send('Performance.getMetrics');
    const afterRemovalHeap = afterRemoval.metrics.find(m => m.name === 'JSHeapUsedSize').value;

    const metrics = {
      baseline: baselineHeap / 1024 / 1024, // MB
      withVectors: withVectorsHeap / 1024 / 1024,
      afterRemoval: afterRemovalHeap / 1024 / 1024,
      memoryPerVector: (withVectorsHeap - baselineHeap) / 20 / 1024 / 1024,
      leaked: (afterRemovalHeap - baselineHeap) / 1024 / 1024
    };

    this.results.tests.push({
      name: 'Memory Usage',
      metrics,
      violations: [],
      passed: metrics.leaked < 10
    });

    console.log(`  Baseline: ${metrics.baseline.toFixed(2)} MB`);
    console.log(`  With 20 vectors: ${metrics.withVectors.toFixed(2)} MB`);
    console.log(`  After removal: ${metrics.afterRemoval.toFixed(2)} MB`);
    console.log(`  Per vector: ${metrics.memoryPerVector.toFixed(2)} MB`);
    console.log(`  Leaked: ${metrics.leaked.toFixed(2)} MB ${metrics.leaked < 10 ? '✓' : '⚠️'}\n`);

    await page.close();
  }

  checkBudgets(metrics, budgets) {
    const violations = [];

    Object.keys(budgets).forEach(key => {
      if (metrics[key] !== undefined) {
        const isInverted = key === 'fps'; // Higher is better for FPS

        if (isInverted) {
          if (metrics[key] < budgets[key]) {
            violations.push({
              metric: key,
              budget: budgets[key],
              actual: metrics[key],
              diff: budgets[key] - metrics[key]
            });
          }
        } else {
          if (metrics[key] > budgets[key]) {
            violations.push({
              metric: key,
              budget: budgets[key],
              actual: metrics[key],
              diff: metrics[key] - budgets[key]
            });
          }
        }
      }
    });

    return violations;
  }

  getStatusIcon(value, budget, inverted = false) {
    if (inverted) {
      return value >= budget ? '✓' : '⚠️';
    }
    return value <= budget ? '✓' : '⚠️';
  }

  generateReports() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON report
    const jsonPath = path.join(this.config.outputDir, `performance-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Markdown report
    const mdPath = path.join(this.config.outputDir, `performance-${timestamp}.md`);
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(mdPath, markdown);

    // CSV report
    const csvPath = path.join(this.config.outputDir, `performance-${timestamp}.csv`);
    const csv = this.generateCSVReport();
    fs.writeFileSync(csvPath, csv);

    console.log(`\n📊 Reports generated:`);
    console.log(`  - ${jsonPath}`);
    console.log(`  - ${mdPath}`);
    console.log(`  - ${csvPath}`);
  }

  generateMarkdownReport() {
    let md = `# Performance Test Report\n\n`;
    md += `**Date:** ${this.results.timestamp}\n`;
    md += `**URL:** ${this.results.url}\n\n`;

    md += `## Summary\n\n`;
    const passed = this.results.tests.filter(t => t.passed).length;
    const total = this.results.tests.length;
    md += `✓ ${passed}/${total} tests passed\n\n`;

    md += `## Test Results\n\n`;

    this.results.tests.forEach(test => {
      md += `### ${test.name}\n\n`;
      md += `**Status:** ${test.passed ? '✓ PASS' : '⚠️ FAIL'}\n\n`;

      if (test.violations.length > 0) {
        md += `**Budget Violations:**\n`;
        test.violations.forEach(v => {
          md += `- ${v.metric}: ${v.actual.toFixed(2)} (budget: ${v.budget}, diff: +${v.diff.toFixed(2)})\n`;
        });
        md += `\n`;
      }

      md += `**Metrics:**\n`;
      md += '```json\n';
      md += JSON.stringify(test.metrics, null, 2);
      md += '\n```\n\n';
    });

    return md;
  }

  generateCSVReport() {
    let csv = 'Test,Metric,Value\n';

    this.results.tests.forEach(test => {
      const flatMetrics = this.flattenObject(test.metrics);
      Object.entries(flatMetrics).forEach(([key, value]) => {
        csv += `${test.name},${key},${value}\n`;
      });
    });

    return csv;
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }
}

// Run tests
(async () => {
  const tester = new PerformanceTester(CONFIG);
  await tester.run();
})();
