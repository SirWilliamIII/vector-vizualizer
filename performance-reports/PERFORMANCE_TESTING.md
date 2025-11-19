# Performance Testing Guide

This guide covers all the performance profiling and testing tools available for the Vector Similarity Explorer.

## Quick Start

### Option 1: Interactive Performance Profiler (Browser-Based)

The easiest way to profile performance is using the built-in browser-based profiler:

```bash
# Start the development server
./start.sh

# Open the performance profiler in your browser
open http://localhost:3000/performance-profiling.html
```

**Features:**
- Real-time Core Web Vitals monitoring (LCP, FID, CLS, FCP, TTFB, TTI)
- Frame rate analysis with 1% low tracking
- Memory usage monitoring with leak detection
- ML model loading performance
- PCA computation benchmarks
- Three.js rendering statistics
- Interactive test controls with progress tracking
- Embedded test application for live testing
- Automatic optimization recommendations

**Usage:**
1. Configure test parameters (vector count, duration, model)
2. Click "Start Full Profile" to run comprehensive analysis
3. Review metrics and recommendations
4. Export results as JSON for tracking over time

### Option 2: Automated Testing with Puppeteer

For CI/CD integration and automated regression testing:

```bash
# Install dependencies
npm install puppeteer

# Run automated performance tests
node test-performance.js

# Or test against a specific URL
node test-performance.js http://localhost:8000
```

**What it tests:**
- Page load performance (TTFB, FCP, LCP, CLS, resource loading)
- Rendering performance at different scales (10, 20, 50 vectors)
- ML model loading times (all three models)
- Interaction performance (hover, click, raycast)
- Memory usage and leak detection

**Output:**
- JSON report: `performance-reports/performance-TIMESTAMP.json`
- Markdown report: `performance-reports/performance-TIMESTAMP.md`
- CSV data: `performance-reports/performance-TIMESTAMP.csv`

## Performance Budgets

The application targets these performance budgets:

### Page Load
- **TTFB**: < 200ms (Time to First Byte)
- **FCP**: < 800ms (First Contentful Paint)
- **LCP**: < 2.5s (Largest Contentful Paint)
- **TTI**: < 3.0s (Time to Interactive)
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Runtime Performance
- **FPS**: > 55 (Minimum acceptable frame rate)
- **Frame Time**: < 18ms (Maximum frame budget)
- **Input Delay**: < 50ms (Maximum interaction latency)

### Computational Performance
- **Raycast Time**: < 5ms (Average per pointer move)
- **PCA Time**: < 100ms (For 20 vectors, 384D → 3D)
- **Model Load**: < 30s (Even on 3G connection)

### Memory Usage
- **Heap Size**: < 200MB (With 50 vectors loaded)
- **Memory Growth**: < 5MB/min (Leak detection threshold)
- **Per Vector**: < 2MB (Memory cost per vector)

## Test Scenarios

### Basic Performance Profile

Tests the application under typical usage conditions (10-20 vectors):

```javascript
// In browser console or performance profiler
async function basicProfile() {
  // 1. Measure initial load
  performance.mark('load-start');
  await page.reload();
  performance.mark('load-end');
  performance.measure('page-load', 'load-start', 'load-end');

  // 2. Add 10 vectors
  for (let i = 0; i < 10; i++) {
    await addCustomVector(`word${i}`);
  }

  // 3. Measure rendering for 10 seconds
  const fps = await measureFPS(10000);
  console.log('Average FPS:', fps);

  // 4. Check memory
  console.log('Memory used:', performance.memory.usedJSHeapSize / 1024 / 1024, 'MB');
}
```

### Stress Test

Tests performance at maximum recommended scale (50 vectors):

```javascript
async function stressTest() {
  // Load maximum vectors
  const words = generateRandomWords(50);

  performance.mark('batch-start');
  for (const word of words) {
    await addCustomVector(word);
  }
  performance.mark('batch-end');

  const duration = performance.measure('batch-upload', 'batch-start', 'batch-end').duration;
  console.log('Batch upload time:', duration, 'ms');

  // Measure FPS under load
  const fps = await measureFPS(10000);
  console.log('FPS with 50 vectors:', fps);

  // Test interaction performance
  const raycastTime = await measureRaycastPerformance(100);
  console.log('Average raycast time:', raycastTime, 'ms');
}
```

### Memory Leak Test

Detects memory leaks by repeatedly adding and removing vectors:

```javascript
async function memoryLeakTest(iterations = 10) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const before = performance.memory.usedJSHeapSize;

    // Add 20 vectors
    for (let j = 0; j < 20; j++) {
      await addCustomVector(`test${i}-${j}`);
    }

    await sleep(1000);

    // Remove all vectors
    window.startFresh();

    await sleep(1000);

    const after = performance.memory.usedJSHeapSize;
    const leaked = (after - before) / 1024 / 1024;

    results.push({ iteration: i + 1, leaked });
    console.log(`Iteration ${i + 1}: ${leaked.toFixed(2)}MB leaked`);
  }

  // Calculate growth trend
  const avgLeak = results.reduce((sum, r) => sum + r.leaked, 0) / results.length;
  console.log(`Average leak per cycle: ${avgLeak.toFixed(2)}MB`);

  return avgLeak < 1; // Pass if < 1MB average leak
}
```

### Model Loading Performance

Measures ML model download and initialization times:

```javascript
async function testModelLoading() {
  const models = ['minilm', 'e5-small', 'bge-small'];
  const results = {};

  for (const model of models) {
    performance.mark(`${model}-start`);

    // Switch to model (triggers loading)
    document.getElementById('model-select').value = model;
    document.getElementById('model-select').dispatchEvent(new Event('change'));

    // Wait for loading complete
    await new Promise(resolve => {
      window.addEventListener('modelLoaded', resolve, { once: true });
    });

    performance.mark(`${model}-end`);
    const duration = performance.measure(`${model}-load`, `${model}-start`, `${model}-end`).duration;

    results[model] = duration;
    console.log(`${model}: ${duration.toFixed(0)}ms`);
  }

  return results;
}
```

## Chrome DevTools Profiling

### Performance Recording

1. Open Chrome DevTools (F12)
2. Navigate to **Performance** tab
3. Click **Record** (⏺️)
4. Interact with the application:
   - Add vectors
   - Rotate camera
   - Select vectors for comparison
   - Switch models
5. Stop recording (⏹️)
6. Analyze the flame graph:
   - Look for long tasks (> 50ms)
   - Identify rendering bottlenecks
   - Check for unnecessary reflows

### Memory Profiling

1. Open Chrome DevTools → **Memory** tab
2. Take **Heap Snapshot** (baseline)
3. Add 20 vectors
4. Take another **Heap Snapshot**
5. Switch to **Comparison** view
6. Look for:
   - Detached DOM nodes
   - Unreleased event listeners
   - Growing object counts
   - Large arrays or buffers

### Rendering Analysis

1. Open Chrome DevTools → **Performance** tab
2. Enable **Screenshots** and **Memory**
3. Record a session with camera rotation and vector selection
4. Analyze:
   - **FPS meter** (aim for 60 FPS green bar)
   - **GPU activity** (should be moderate, not maxed)
   - **JavaScript execution** (should be minimal per frame)
   - **Rendering** (should be consistent, no spikes)

## Lighthouse Testing

Run Lighthouse for automated performance audits:

```bash
# Install Lighthouse
npm install -g lighthouse

# Run performance audit
lighthouse http://localhost:8000 \
  --output json \
  --output html \
  --preset=perf

# Run with specific device simulation
lighthouse http://localhost:8000 \
  --emulated-form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4
```

**Key Metrics from Lighthouse:**
- Performance Score (target: > 90)
- First Contentful Paint (target: < 1.8s)
- Speed Index (target: < 3.4s)
- Largest Contentful Paint (target: < 2.5s)
- Time to Interactive (target: < 3.8s)
- Total Blocking Time (target: < 300ms)
- Cumulative Layout Shift (target: < 0.1)

## Continuous Integration

### GitHub Actions Workflow

Add performance testing to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install puppeteer

      - name: Start server
        run: |
          python -m http.server 8000 &
          sleep 5

      - name: Run performance tests
        run: node test-performance.js http://localhost:8000

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-reports/

      - name: Check for regressions
        run: |
          node scripts/check-performance-regression.js
```

## Performance Monitoring in Production

### Real User Monitoring (RUM)

Track real user performance with the Web Vitals library:

```html
<!-- Add to index.html -->
<script type="module">
  import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'https://unpkg.com/web-vitals@3?module';

  function sendToAnalytics(metric) {
    // Send to your analytics service
    console.log(metric.name, metric.value);

    // Example: Send to Google Analytics
    if (window.gtag) {
      gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true
      });
    }
  }

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
</script>
```

### Performance Monitoring Dashboard

Create a simple monitoring dashboard:

```javascript
// performance-monitor.js (run in production)
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();

    this.initCoreWebVitals();
    this.initRuntimeMetrics();
  }

  initCoreWebVitals() {
    // Collect Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        const fid = firstInput.processingStart - firstInput.startTime;
        this.recordMetric('fid', fid);
      }).observe({ type: 'first-input', buffered: true });

      // CLS
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('cls', clsValue);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }

  initRuntimeMetrics() {
    // Monitor FPS
    let frames = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frames++;
      const now = performance.now();

      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        this.recordMetric('fps', fps);
        frames = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);

    // Monitor memory (if available)
    if (performance.memory) {
      setInterval(() => {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        this.recordMetric('memory', usedMB);
      }, 5000);
    }
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push({
      timestamp: Date.now() - this.startTime,
      value
    });

    // Keep last 100 samples per metric
    if (this.metrics.get(name).length > 100) {
      this.metrics.get(name).shift();
    }
  }

  getMetrics() {
    const summary = {};

    this.metrics.forEach((values, name) => {
      const nums = values.map(v => v.value);
      summary[name] = {
        current: nums[nums.length - 1],
        avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums)
      };
    });

    return summary;
  }

  sendToServer() {
    // Send metrics to your backend for aggregation
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        metrics: this.getMetrics(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });
  }
}

// Initialize in production
const monitor = new PerformanceMonitor();

// Send metrics every 60 seconds
setInterval(() => monitor.sendToServer(), 60000);
```

## Interpreting Results

### Good Performance Indicators

✅ **Page Load:**
- LCP < 2.5s
- CLS < 0.1
- FCP < 1.8s
- TTI < 3.0s

✅ **Rendering:**
- Consistent 55-60 FPS
- Frame time < 16ms
- No visible stuttering during camera movement

✅ **Memory:**
- Heap growth < 5MB/min
- Memory returns to baseline after clearing vectors
- No detached DOM nodes in heap snapshots

✅ **Interactions:**
- Hover response < 50ms
- Raycast time < 5ms average
- Smooth animations during selection

### Performance Issues to Watch For

⚠️ **Frame Rate Drops:**
- FPS < 30 indicates severe rendering bottleneck
- Check LOD system, draw calls, shader complexity
- Profile with Chrome DevTools to identify hot spots

⚠️ **Memory Leaks:**
- Heap size growing continuously (> 10MB/min)
- Memory not returning to baseline after clearing
- Check for unreleased event listeners, textures, geometries

⚠️ **Slow Interactions:**
- Hover lag > 100ms indicates raycasting bottleneck
- Check object count, raycast optimization
- Consider spatial partitioning or BVH

⚠️ **Long Tasks:**
- JavaScript execution > 50ms blocks main thread
- Check PCA computation, model inference, batch operations
- Consider WebWorkers for heavy computation

## Optimization Workflow

When performance issues are detected:

1. **Profile** with Chrome DevTools to identify bottleneck
2. **Measure** baseline metrics before optimization
3. **Implement** targeted optimization (see PERFORMANCE_ANALYSIS.md)
4. **Validate** improvement with automated tests
5. **Document** changes and performance impact
6. **Monitor** in production for regressions

## Resources

- **Performance Profiler**: `/performance-profiling.html`
- **Detailed Analysis**: `/PERFORMANCE_ANALYSIS.md`
- **Automated Tests**: `/test-performance.js`
- **Chrome DevTools**: [Performance Profiling Guide](https://developer.chrome.com/docs/devtools/performance/)
- **Web Vitals**: [web.dev/vitals](https://web.dev/vitals/)
- **Lighthouse**: [GitHub - GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse)

---

**Questions or Issues?**

If you encounter performance problems not covered in this guide, please:
1. Run the automated performance test suite
2. Capture a Chrome DevTools performance profile
3. Document the specific scenario and metrics
4. Review PERFORMANCE_ANALYSIS.md for optimization strategies
