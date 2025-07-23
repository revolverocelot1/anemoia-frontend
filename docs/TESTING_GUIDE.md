# Testing Guide

This guide explains how to run and write tests for the Anemoia Frontend project.

## Overview

We use **Vitest** as our testing framework, which provides:
- Fast unit test execution
- React component testing with Testing Library
- Built-in TypeScript support
- Code coverage reporting
- Watch mode for development

## Running Tests

### Local Development

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### GitHub Actions

Tests run automatically on:
- Every push to `main`, `develop`, and `ascii` branches
- Every pull request to `main` and `develop`
- Manual workflow dispatch

## Test Structure

```
src/
├── tests/
│   └── setup.ts         # Global test setup and mocks
├── pages/
│   ├── ASCIIVideoConverter.test.tsx
│   └── ImageComparisonPage.test.tsx
├── workers/
│   └── asciiProcessor.worker.test.ts
└── utils/
    └── common.test.ts
```

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(
      <BrowserRouter>
        <MyComponent />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });
});
```

### Worker Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock worker environment
const mockPostMessage = vi.fn();
global.postMessage = mockPostMessage;

describe('Worker', () => {
  it('should process data', () => {
    // Test worker logic
  });
});
```

### Utility Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myUtility } from './myUtility';

describe('myUtility', () => {
  it('should return expected result', () => {
    expect(myUtility(input)).toBe(expectedOutput);
  });
});
```

## Test Categories

### 1. Unit Tests
- Test individual functions and components in isolation
- Mock external dependencies
- Fast execution
- Located next to the code they test

### 2. Integration Tests
- Test how multiple components work together
- Test worker communication
- Test API interactions

### 3. Component Tests
- Test React components with user interactions
- Use Testing Library for queries
- Test accessibility features

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Mocking
- Mock external dependencies (APIs, workers, etc.)
- Use `vi.mock()` for module mocking
- Reset mocks between tests with `vi.clearAllMocks()`

### 3. Async Testing
- Use `async/await` for async operations
- Use `waitFor` for elements that appear asynchronously
- Set appropriate timeouts for long operations

### 4. Coverage Goals
- Aim for 70% code coverage minimum
- Focus on critical paths and edge cases
- Don't test implementation details

## Common Testing Patterns

### File Upload Testing
```typescript
const file = new File(['content'], 'test.png', { type: 'image/png' });
const input = screen.getByLabelText(/upload/i);
await user.upload(input, file);
```

### Worker Testing
```typescript
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
vi.mocked(Worker).mockImplementation(() => mockWorker);
```

### Slider/Input Testing
```typescript
const slider = screen.getByRole('slider');
fireEvent.change(slider, { target: { value: '50' } });
expect(slider).toHaveAttribute('value', '50');
```

## Debugging Tests

### VS Code
1. Install "Vitest" extension
2. Tests will show inline in the editor
3. Click play button to run individual tests

### Command Line
```bash
# Run specific test file
npm test src/pages/ASCIIVideoConverter.test.tsx

# Run tests matching pattern
npm test -- --grep "should upload"

# Debug mode
node --inspect-brk ./node_modules/.bin/vitest
```

## CI/CD Integration

### GitHub Actions Workflow
- Tests run on multiple Node.js versions (18.x, 20.x)
- Tests run on both Linux and Windows
- Coverage reports uploaded to Codecov
- Build artifacts saved for deployment

### Pre-commit Hooks
Consider adding husky for pre-commit testing:
```bash
npm install -D husky
npx husky add .husky/pre-commit "npm test"
```

## Troubleshooting

### Common Issues

1. **Canvas/WebGL Errors**
   - Already mocked in `setup.ts`
   - Check mock implementations if issues persist

2. **Worker Import Errors**
   - Use `?worker` suffix for worker imports
   - Mock worker modules properly

3. **React Router Errors**
   - Always wrap components with `BrowserRouter` in tests
   - Mock `useNavigate` when testing navigation

4. **Async Timeout Errors**
   - Increase timeout: `{ timeout: 10000 }`
   - Use `waitFor` with appropriate options

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) 