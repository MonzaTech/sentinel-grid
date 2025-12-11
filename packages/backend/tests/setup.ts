/**
 * Jest test setup
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.API_KEY = 'test-api-key';

// Increase timeout for async operations
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
