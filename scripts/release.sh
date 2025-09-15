#!/bin/bash

# Friday Release Script for @wishyor/pubsub-adapters v1.0.2
# Usage: ./scripts/release.sh

set -e

echo "🚀 Starting Friday Release v1.0.2..."

# Verify we're on master branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "master" ]; then
  echo "❌ Must be on master branch for release. Currently on: $BRANCH"
  exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory must be clean for release"
  git status --short
  exit 1
fi

echo "✅ Pre-flight checks passed"

# Run tests
echo "🧪 Running tests..."
pnpm test

# Build package
echo "🔨 Building package..."
pnpm build

# Run linting
echo "🔍 Running linter..."
pnpm lint

# Check bundle size
echo "📦 Checking bundle size..."
pnpm size-check

echo "✅ All checks passed!"

# Create git tag
echo "🏷️  Creating git tag v1.0.2..."
git add .
git commit -m "chore: release v1.0.2 - Friday Release

- NATS adapter promoted to Production Ready
- Performance improvements across all brokers
- Enhanced message processing capabilities
- Bug fixes and stability improvements"

git tag -a v1.0.2 -m "Release v1.0.2 - Friday Release

🎉 Major Highlights:
- NATS adapter now Production Ready
- 15-20% performance improvements
- Enhanced reliability and monitoring
- Comprehensive bug fixes

See RELEASE_NOTES.md for full details."

echo "📤 Pushing to remote..."
git push origin master
git push origin v1.0.2

echo "🎉 Friday Release v1.0.2 completed successfully!"
echo "📋 Next steps:"
echo "   1. Publish to npm: pnpm publish"
echo "   2. Create GitHub release from tag v1.0.2"
echo "   3. Update documentation if needed"