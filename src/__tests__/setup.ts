/**
 * Test setup configuration
 */

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  // eslint-disable-next-line no-console
  console.log = jest.fn();
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
  // eslint-disable-next-line no-console
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console after each test
  // eslint-disable-next-line no-console
  Object.assign(console, originalConsole);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add a dummy test to prevent "no tests" error
describe('Setup', () => {
  it('should configure test environment', () => {
    expect(true).toBe(true);
  });
});

// Mock Redis for tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    off: jest.fn(),
    status: 'ready',
  }));
});

// Mock NATS for tests
jest.mock('nats', () => ({
  connect: jest.fn().mockResolvedValue({
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue({
      unsubscribe: jest.fn(),
    }),
    close: jest.fn().mockResolvedValue(undefined),
    isClosed: jest.fn().mockReturnValue(false),
  }),
}));

// Mock KafkaJS for tests
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue([]),
    }),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));
