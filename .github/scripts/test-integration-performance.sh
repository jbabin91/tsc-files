#!/bin/bash
set -e

# Performance test script for integration tests
# Usage: ./scripts/test-integration-performance.sh [package_manager]

PACKAGE_MANAGER="${1:-npm}"
START_TIME=$(date +%s)

echo "🚀 Testing integration performance with $PACKAGE_MANAGER..."
echo "📅 Started at: $(date)"
echo ""

# Build the package first
echo "📦 Building package..."
build_start=$(date +%s)
pnpm build > /dev/null 2>&1
pnpm pack > /dev/null 2>&1
build_end=$(date +%s)
build_duration=$((build_end - build_start))
echo "✅ Package built in ${build_duration}s"

# Find the tarball
TARBALL=$(ls jbabin91-tsc-files-*.tgz 2>/dev/null | head -n1)
if [[ -z "$TARBALL" ]]; then
    echo "❌ No tarball found"
    exit 1
fi

# Create test directory
TEST_DIR="perf-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo ""
echo "🧪 Running integration tests..."

# Setup phase timing
setup_start=$(date +%s)

# Install TypeScript
echo "  Installing TypeScript..."
npm install -g typescript@latest --silent > /dev/null 2>&1

# Setup package manager
case "$PACKAGE_MANAGER" in
    "npm")
        npm init -y --silent > /dev/null 2>&1
        ;;
    "yarn")
        if ! command -v yarn &> /dev/null; then
            npm install -g yarn --silent > /dev/null 2>&1
        fi
        yarn init -y --silent > /dev/null 2>&1
        ;;
    "pnpm")
        if ! command -v pnpm &> /dev/null; then
            npm install -g pnpm --silent > /dev/null 2>&1
        fi
        pnpm init --silent > /dev/null 2>&1
        ;;
    "bun")
        if ! command -v bun &> /dev/null; then
            curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
            export PATH="$HOME/.bun/bin:$PATH"
        fi
        if command -v bun &> /dev/null; then
            bun init -y > /dev/null 2>&1
        else
            npm init -y --silent > /dev/null 2>&1
        fi
        ;;
esac

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

# Install tsc-files
case "$PACKAGE_MANAGER" in
    "npm")
        npm install -g "../$TARBALL" --silent > /dev/null 2>&1
        ;;
    "yarn")
        yarn global add "file:../$TARBALL" --silent > /dev/null 2>&1
        ;;
    "pnpm")
        pnpm install -g "../$TARBALL" --silent > /dev/null 2>&1
        ;;
    "bun")
        if command -v bun &> /dev/null; then
            bun install -g "../$TARBALL" > /dev/null 2>&1
        else
            npm install -g "../$TARBALL" --silent > /dev/null 2>&1
        fi
        ;;
esac

setup_end=$(date +%s)
setup_duration=$((setup_end - setup_start))
echo "  ✅ Setup completed in ${setup_duration}s"

# Test execution phase timing
test_start=$(date +%s)

# Test 1: Valid file
echo 'const message: string = "Hello, World!";' > valid.ts
tsc-files valid.ts > /dev/null 2>&1

# Test 2: Error detection
echo 'const x: string = 123;' > error.ts
tsc-files error.ts > /dev/null 2>&1 || true

# Test 3: Multiple files
echo 'export const utils = { add: (a: number, b: number) => a + b };' > utils.ts
echo 'import { utils } from "./utils";' > main.ts
tsc-files utils.ts main.ts > /dev/null 2>&1

# Test 4: CLI options
tsc-files --help > /dev/null 2>&1
tsc-files --version > /dev/null 2>&1

test_end=$(date +%s)
test_duration=$((test_end - test_start))
echo "  ✅ Tests completed in ${test_duration}s"

# Cleanup
cd ..
rm -rf "$TEST_DIR"
rm -f "$TARBALL"

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo "📊 Performance Results:"
echo "  📦 Build: ${build_duration}s"
echo "  ⚙️ Setup: ${setup_duration}s"
echo "  🧪 Tests: ${test_duration}s"
echo "  ⏱️ Total: ${TOTAL_DURATION}s"
echo ""

# Performance validation
if (( TOTAL_DURATION <= 15 )); then
    echo "🎯 EXCELLENT: ${TOTAL_DURATION}s (target: <15s for local)"
    exit 0
elif (( TOTAL_DURATION <= 30 )); then
    echo "✅ GOOD: ${TOTAL_DURATION}s (target: <30s for local)"
    exit 0
elif (( TOTAL_DURATION <= 60 )); then
    echo "⚠️ ACCEPTABLE: ${TOTAL_DURATION}s (CI target: <60s)"
    exit 0
else
    echo "❌ TOO SLOW: ${TOTAL_DURATION}s (exceeds 60s CI target)"
    exit 1
fi