# Performance Requirements

This document outlines the performance requirements, benchmarks, and optimization strategies for the tsc-files TypeScript CLI tool.

## Performance Targets

### **Execution Time Requirements**

| Project Size | File Count     | Target Time   | Maximum Time  |
| ------------ | -------------- | ------------- | ------------- |
| Small        | 1-10 files     | < 2 seconds   | < 5 seconds   |
| Medium       | 11-100 files   | < 10 seconds  | < 30 seconds  |
| Large        | 101-1000 files | < 60 seconds  | < 120 seconds |
| Enterprise   | 1000+ files    | < 300 seconds | < 600 seconds |

### **Memory Usage Requirements**

| Project Size | Peak Memory Usage | Sustained Memory |
| ------------ | ----------------- | ---------------- |
| Small        | < 100 MB          | < 50 MB          |
| Medium       | < 300 MB          | < 150 MB         |
| Large        | < 800 MB          | < 400 MB         |
| Enterprise   | < 2 GB            | < 1 GB           |

### **Startup Time Requirements**

- **Cold Start**: < 500ms (first run, no cache)
- **Warm Start**: < 200ms (with cache and detected environment)
- **Help/Version**: < 100ms (simple operations)

## Benchmark Scenarios

### **Test Projects**

#### **Small Project Benchmark**

```text
Project: React Component Library
- Files: 15 TypeScript files
- Total Lines: ~2,000 LOC
- Dependencies: React, React DOM
- Expected Time: < 2 seconds
```

#### **Medium Project Benchmark**

```text
Project: Express API Server
- Files: 75 TypeScript files
- Total Lines: ~15,000 LOC
- Dependencies: Express, Prisma, Jest
- Expected Time: < 10 seconds
```

#### **Large Project Benchmark**

```text
Project: Full-Stack Application
- Files: 500 TypeScript files
- Total Lines: ~100,000 LOC
- Dependencies: Next.js, tRPC, Prisma
- Expected Time: < 60 seconds
```

#### **Enterprise Project Benchmark**

```text
Project: Microservices Platform
- Files: 2,000+ TypeScript files
- Total Lines: ~500,000+ LOC
- Dependencies: Complex monorepo setup
- Expected Time: < 300 seconds
```

### **Performance Test Suite**

```typescript
// tests/performance/benchmarks.test.ts
import { bench, describe } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('Performance Benchmarks', () => {
  bench(
    'Small project type checking',
    async () => {
      await execFileAsync('tsc-files', [
        'tests/fixtures/small-project/**/*.ts',
      ]);
    },
    { time: 5000 },
  );

  bench(
    'Package manager detection',
    async () => {
      await detectPackageManager(process.cwd());
    },
    { time: 1000 },
  );

  bench(
    'TypeScript compiler location',
    async () => {
      await findTypeScriptCompiler(process.cwd());
    },
    { time: 1000 },
  );

  bench(
    'Temporary config generation',
    async () => {
      await generateTempConfig({
        originalConfig: sampleConfig,
        targetFiles: sampleFiles,
        workingDir: process.cwd(),
      });
    },
    { time: 2000 },
  );
});
```

## Performance Optimization Strategies

### **Environment Detection Optimization**

#### **Caching Strategy**

```typescript
interface EnvironmentCache {
  packageManager: PackageManagerInfo;
  typeScriptLocation: TypeScriptInfo;
  configPath: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class EnvironmentDetector {
  private cache = new Map<string, EnvironmentCache>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async detectWithCache(projectRoot: string): Promise<Environment> {
    const cached = this.cache.get(projectRoot);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached;
    }

    const detected = await this.detectFresh(projectRoot);
    this.cache.set(projectRoot, {
      ...detected,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });

    return detected;
  }
}
```

#### **Parallel Detection**

```typescript
async function detectEnvironmentParallel(
  projectRoot: string,
): Promise<Environment> {
  const [packageManager, typeScript, config] = await Promise.all([
    detectPackageManager(projectRoot),
    findTypeScriptCompiler(projectRoot),
    findTsConfig(projectRoot),
  ]);

  return { packageManager, typeScript, config };
}
```

### **File Processing Optimization**

#### **Incremental Processing**

```typescript
interface FileProcessingOptions {
  concurrency?: number;
  batchSize?: number;
  skipUnchanged?: boolean;
}

async function processFilesInBatches(
  files: string[],
  options: FileProcessingOptions = {},
): Promise<ProcessingResult[]> {
  const {
    concurrency = Math.min(4, os.cpus().length),
    batchSize = 50,
    skipUnchanged = true,
  } = options;

  const batches = chunk(files, batchSize);
  const results: ProcessingResult[] = [];

  // Process batches with controlled concurrency
  const semaphore = new Semaphore(concurrency);

  await Promise.all(
    batches.map(async (batch) => {
      await semaphore.acquire();
      try {
        const batchResults = await processBatch(batch, { skipUnchanged });
        results.push(...batchResults);
      } finally {
        semaphore.release();
      }
    }),
  );

  return results;
}
```

#### **Stream Processing for Large Output**

```typescript
class StreamingOutputProcessor {
  private buffer = '';
  private errorProcessor = new StreamingErrorProcessor();

  processChunk(chunk: string): TypeScriptError[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');

    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || '';

    const errors: TypeScriptError[] = [];
    for (const line of lines) {
      const error = this.errorProcessor.parseLine(line);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }
}
```

### **Memory Management**

#### **Garbage Collection Optimization**

```typescript
class MemoryManager {
  private readonly GC_INTERVAL = 100; // Process every 100 files
  private processedCount = 0;

  async processWithGC<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
  ): Promise<void> {
    for (const item of items) {
      await processor(item);
      this.processedCount++;

      if (this.processedCount % this.GC_INTERVAL === 0) {
        // Suggest garbage collection for large datasets
        if (global.gc) {
          global.gc();
        }
      }
    }
  }
}
```

#### **Resource Pool Management**

```typescript
class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private destroyer: (resource: T) => void;

  constructor(
    factory: () => T,
    destroyer: (resource: T) => void,
    initialSize: number = 5,
  ) {
    this.factory = factory;
    this.destroyer = destroyer;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    let resource = this.available.pop();
    if (!resource) {
      resource = this.factory();
    }

    this.inUse.add(resource);
    return resource;
  }

  release(resource: T): void {
    if (this.inUse.delete(resource)) {
      this.available.push(resource);
    }
  }

  destroy(): void {
    [...this.available, ...this.inUse].forEach(this.destroyer);
    this.available = [];
    this.inUse.clear();
  }
}
```

## Performance Monitoring

### **Built-in Performance Metrics**

```typescript
interface PerformanceMetrics {
  totalDuration: number;
  phases: {
    detection: number;
    configuration: number;
    execution: number;
    parsing: number;
    cleanup: number;
  };
  memory: {
    peak: number;
    average: number;
    final: number;
  };
  fileStats: {
    totalFiles: number;
    processedFiles: number;
    skippedFiles: number;
    errorFiles: number;
  };
}

class PerformanceTracker {
  private startTime = Date.now();
  private phaseTimers = new Map<string, number>();
  private memorySnapshots: number[] = [];

  startPhase(phase: string): void {
    this.phaseTimers.set(phase, Date.now());
  }

  endPhase(phase: string): number {
    const startTime = this.phaseTimers.get(phase);
    if (!startTime) throw new Error(`Phase ${phase} not started`);

    const duration = Date.now() - startTime;
    this.phaseTimers.delete(phase);
    return duration;
  }

  recordMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.memorySnapshots.push(usage.heapUsed);
  }

  getMetrics(): PerformanceMetrics {
    return {
      totalDuration: Date.now() - this.startTime,
      phases: this.getPhaseMetrics(),
      memory: this.getMemoryMetrics(),
      fileStats: this.getFileStats(),
    };
  }
}
```

### **Performance Reporting**

```typescript
function generatePerformanceReport(metrics: PerformanceMetrics): string {
  const report = [
    '📊 Performance Report',
    '===================',
    '',
    `⏱️  Total Duration: ${metrics.totalDuration}ms`,
    `📁 Files Processed: ${metrics.fileStats.processedFiles}/${metrics.fileStats.totalFiles}`,
    `💾 Peak Memory: ${formatBytes(metrics.memory.peak)}`,
    '',
    '📈 Phase Breakdown:',
    ...Object.entries(metrics.phases).map(
      ([phase, duration]) => `  ${phase}: ${duration}ms`,
    ),
    '',
    '🎯 Performance Score: ' + calculatePerformanceScore(metrics),
  ];

  return report.join('\n');
}

function calculatePerformanceScore(metrics: PerformanceMetrics): string {
  const { totalDuration, fileStats } = metrics;
  const filesPerSecond = fileStats.processedFiles / (totalDuration / 1000);

  if (filesPerSecond > 50) return '🟢 Excellent';
  if (filesPerSecond > 20) return '🟡 Good';
  if (filesPerSecond > 10) return '🟠 Fair';
  return '🔴 Needs Optimization';
}
```

## Performance Testing Strategy

### **Automated Performance Testing**

```bash
#!/bin/bash
# scripts/performance-test.sh

echo "🚀 Running Performance Tests"

# Test different project sizes
for size in small medium large; do
  echo "Testing $size project..."

  # Run benchmark multiple times for accuracy
  times=()
  for i in {1..5}; do
    start_time=$(date +%s%N)
    tsc-files "tests/fixtures/$size-project/**/*.ts" > /dev/null 2>&1
    end_time=$(date +%s%N)

    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    times+=($duration)
  done

  # Calculate average
  total=0
  for time in "${times[@]}"; do
    total=$((total + time))
  done
  average=$((total / ${#times[@]}))

  echo "  Average time: ${average}ms"
  echo "  Individual runs: ${times[*]}"
  echo ""
done
```

### **Memory Leak Detection**

```typescript
// tests/performance/memory-leak.test.ts
describe('Memory Leak Detection', () => {
  test('memory usage remains stable across multiple runs', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const measurements: number[] = [];

    // Run type checking multiple times
    for (let i = 0; i < 10; i++) {
      await runTypeChecking(['tests/fixtures/medium-project/**/*.ts']);

      // Force garbage collection if available
      if (global.gc) global.gc();

      measurements.push(process.memoryUsage().heapUsed);
    }

    const finalMemory = measurements[measurements.length - 1];
    const memoryGrowth = finalMemory - initialMemory;

    // Memory growth should be minimal (< 10MB)
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
  });
});
```

### **Regression Testing**

```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    paths:
      - 'src/**'
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        run: pnpm build

      - name: Run performance tests
        run: |
          # Run performance benchmarks
          pnpm run test:performance > performance-results.txt

          # Check if performance regression occurred
          node scripts/check-performance-regression.js

      - name: Upload performance results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: performance-results.txt
```

## Performance Troubleshooting

### **Common Performance Issues**

#### **Slow Package Manager Detection**

```bash
# Debug package manager detection time
time tsc-files --verbose src/index.ts 2>&1 | grep -E "(Detecting|package manager)"

# Solution: Cache detection results
export TSC_FILES_CACHE_ENV=true
```

#### **Large TypeScript Project Slowdown**

```bash
# Use skipLibCheck for development
tsc-files --skipLibCheck "src/**/*.ts"

# Profile with verbose output
tsc-files --verbose --project tsconfig.json "src/**/*.ts" 2>&1 | head -20
```

#### **Memory Usage Spikes**

```bash
# Monitor memory usage during execution
(/usr/bin/time -v tsc-files "src/**/*.ts") 2>&1 | grep -E "(Maximum resident|User time)"

# Use streaming processing for large outputs
tsc-files --stream "src/**/*.ts"
```

### **Performance Optimization Checklist**

- [ ] **Environment Detection**
  - [ ] Cache detection results between runs
  - [ ] Use parallel detection for independent components
  - [ ] Skip unnecessary detection steps

- [ ] **File Processing**
  - [ ] Implement batch processing for large file sets
  - [ ] Use incremental processing when possible
  - [ ] Stream large outputs instead of buffering

- [ ] **Memory Management**
  - [ ] Monitor memory usage throughout execution
  - [ ] Implement resource pooling for reusable objects
  - [ ] Use garbage collection hints for large datasets

- [ ] **TypeScript Integration**
  - [ ] Optimize temporary configuration generation
  - [ ] Use appropriate TypeScript compiler options
  - [ ] Minimize subprocess overhead

This performance framework ensures tsc-files operates efficiently across all project sizes while maintaining reliability and user experience standards.
