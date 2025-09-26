#!/bin/bash
set -e

# Quick built package test (tests pre-built CLI directly, no package installation)
echo "🚀 Quick Built Package Test"
START_TIME=$(date +%s)

# Skip build in CI - assume dist/ already exists from Build Package step
if [[ "$CI" == "true" ]]; then
    echo "📦 Skipping build in CI (using pre-built package)..."
else
    echo "📦 Building..."
    pnpm build --silent
fi

# Create test directory
TEST_DIR="quick-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Install TypeScript in test directory for CLI execution
echo "  Installing TypeScript for test environment..."
npm init -y > /dev/null 2>&1
npm install typescript --no-audit --no-fund > /dev/null 2>&1

# Create minimal test setup
echo '{"compilerOptions": {"target": "ES2020", "strict": true}}' > tsconfig.json
echo 'const message: string = "Hello";' > valid.ts
echo 'const x: string = 123;' > error.ts

# Test using the built CLI directly
CLI_PATH="../dist/cli.js"

echo "🧪 Running tests..."

# Test 1: Valid file
echo "  Testing valid file..."
if node "$CLI_PATH" valid.ts > /dev/null 2>&1; then
    echo "  ✅ Valid file test passed"
else
    echo "  ❌ Valid file test failed"
    exit 1
fi

# Test 2: Error detection
echo "  Testing error detection..."
if node "$CLI_PATH" error.ts > /dev/null 2>&1; then
    echo "  ❌ Error detection test failed"
    exit 1
else
    echo "  ✅ Error detection test passed"
fi

# Test 3: Help flag
echo "  Testing help flag..."
if node "$CLI_PATH" --help | grep -q "Usage:"; then
    echo "  ✅ Help flag test passed"
else
    echo "  ❌ Help flag test failed"
    exit 1
fi

# Test 4: Version flag
echo "  Testing version flag..."
if node "$CLI_PATH" --version | grep -E "[0-9]+\.[0-9]+\.[0-9]+"; then
    echo "  ✅ Version flag test passed"
else
    echo "  ❌ Version flag test failed"
    exit 1
fi

# Cleanup
cd ..
rm -rf "$TEST_DIR"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "✅ All tests passed in ${DURATION}s"

if (( DURATION <= 5 )); then
    echo "🎯 EXCELLENT performance!"
elif (( DURATION <= 10 )); then
    echo "✅ Good performance"
else
    echo "⚠️ Could be faster (${DURATION}s)"
fi