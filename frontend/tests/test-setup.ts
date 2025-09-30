import '@testing-library/jest-dom';

// Extend vitest expect with jest-dom matchers
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Declare the matchers for TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface JestAssertion<T = unknown> extends jest.Matchers<void, T> {}
  }
}
