# Contributing to @wishyor/pubsub-adapters

Thank you for your interest in contributing to @wishyor/pubsub-adapters! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- pnpm (recommended) or npm
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pubsub-adapters.git
cd pubsub-adapters

# Install dependencies
pnpm install

# Run tests to ensure everything is working
pnpm test
```

### Optional: Broker Setup for Integration Tests

For full integration testing, you may want to set up local message brokers:

```bash
# Redis (using Docker)
docker run -d -p 6379:6379 redis:alpine

# NATS (using Docker)
docker run -d -p 4222:4222 nats:alpine

# Kafka (using Docker Compose)
# See docker-compose.yml in the repository
```

## Project Structure

```
src/
├── adapter/           # Broker-specific adapters
├── factory/           # Factory classes for creating managers
├── handlers/          # Message processing handlers
├── helper/            # Utility helpers
├── universal/         # Universal components
├── utils/             # Utility classes
├── types.ts           # TypeScript type definitions
└── index.ts           # Main entry point

examples/              # Usage examples
scripts/               # Build and utility scripts
__tests__/             # Test files
```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

feat(redis): add connection pooling support
fix(kafka): resolve memory leak in consumer
docs(readme): update installation instructions
test(manager): add unit tests for subscription filtering
```

### Development Commands

```bash
# Development mode with auto-reload
pnpm dev

# Build the project
pnpm build

# Run tests
pnpm test
pnpm test:watch
pnpm test:coverage

# Linting and formatting
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check

# Generate documentation
pnpm docs

# Check bundle size
pnpm size-check
```

## Testing

### Test Types

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Benchmark throughput and latency

### Writing Tests

- Place test files next to the code they test with `.test.ts` extension
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies appropriately

```typescript
describe('UniversalMessageManager', () => {
  describe('publish', () => {
    it('should publish message to the correct topic', async () => {
      // Arrange
      const manager = new UniversalMessageManager(mockAdapter, config);
      const payload = { userId: 123 };

      // Act
      await manager.publish('user.events', payload);

      // Assert
      expect(mockAdapter.publish).toHaveBeenCalledWith(
        'user.events',
        expect.objectContaining({ payload })
      );
    });
  });
});
```

### Test Coverage

- Maintain minimum 80% test coverage
- Focus on testing public APIs and critical paths
- Include edge cases and error scenarios

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable properties
- Avoid `any` - use `unknown` when type is uncertain
- Use proper JSDoc comments for public APIs

### Naming Conventions

- **Classes**: PascalCase (`MessageManager`)
- **Interfaces**: PascalCase with `I` prefix (`IMessage`)
- **Functions/Methods**: camelCase (`publishMessage`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: kebab-case (`message-manager.ts`)

### Code Organization

- Keep functions small and focused (< 50 lines)
- Use meaningful variable and function names
- Group related functionality together
- Separate concerns appropriately
- Add comments for complex business logic

### Performance Considerations

- Avoid blocking operations in hot paths
- Use object pooling for frequently created objects
- Implement proper error handling without performance penalties
- Consider memory usage in high-throughput scenarios

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Ensure README, CHANGELOG, and JSDoc are updated
2. **Add Tests**: Include tests for new functionality
3. **Check CI**: Ensure all CI checks pass
4. **Review Checklist**: Complete the PR template checklist
5. **Request Review**: Tag appropriate reviewers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No breaking changes (or properly documented)
```

### Review Criteria

- **Functionality**: Does the code work as intended?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security concerns?
- **Maintainability**: Is the code easy to understand and maintain?
- **Testing**: Is the code adequately tested?
- **Documentation**: Is the code properly documented?

## Release Process

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build and verify package
5. Create release tag
6. Publish to npm
7. Update documentation

## Getting Help

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check the README and inline documentation
- **Examples**: Review the examples directory

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for significant contributions
- README.md contributors section
- GitHub contributors graph

Thank you for contributing to @wishyor/pubsub-adapters!