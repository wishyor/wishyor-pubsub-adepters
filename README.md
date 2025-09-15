# @wishyor/pubsub-adapters

[![npm version](https://badge.fury.io/js/%40wishyor%2Fpubsub-adapters.svg)](https://badge.fury.io/js/%40wishyor%2Fpubsub-adapters)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Universal pub/sub message broker adapters with full TypeScript support for Redis and Kafka. NATS support is in beta. Provides a unified interface for message publishing and subscription across different message brokers with built-in performance monitoring, circuit breakers, and retry mechanisms.

## Features

- 🚀 **Universal Interface**: Single API for Redis and Kafka (NATS in beta)
- 📝 **Full TypeScript Support**: Complete type definitions and IntelliSense
- ⚡ **High Performance**: Optimized for throughput and low latency
- 🔄 **Retry Logic**: Built-in exponential backoff and circuit breakers
- 📊 **Performance Monitoring**: Real-time metrics and health checks
- 🎯 **Message Filtering**: Advanced subscription filtering capabilities
- 🔧 **Middleware Support**: Extensible message processing pipeline
- 📦 **Zero Dependencies**: Peer dependencies only for broker clients
- 🛡️ **Production Ready**: Comprehensive error handling and logging

## Installation

```bash
npm install @wishyor/pubsub-adapters

# Install peer dependencies for your chosen broker(s)
npm install ioredis        # For Redis (Production Ready)
npm install kafkajs        # For Kafka (Production Ready)
npm install nats           # For NATS (Beta)
```

## Quick Start

### Redis Example

```typescript
import { MessageBrokerFactory } from '@wishyor/pubsub-adapters';
import Redis from 'ioredis';

const manager = await MessageBrokerFactory.createRedis(
  'localhost',
  6379,
  Redis
);

await manager.connect();

// Subscribe to messages
const subscriptionId = await manager.subscribe('user.events', (message) => {
  console.log('Received:', message.payload);
});

// Publish a message
await manager.publish('user.events', {
  userId: 123,
  action: 'login',
  timestamp: Date.now()
});
```

### NATS Example (Beta)

> **Note**: NATS support is currently in beta. Use with caution in production environments.

```typescript
import { MessageBrokerFactory } from '@wishyor/pubsub-adapters';
import { connect } from 'nats';

const manager = await MessageBrokerFactory.createNATS(
  ['nats://localhost:4222'],
  { connect }
);

await manager.connect();

// Subscribe with queue group for load balancing
await manager.subscribe('orders.process', (message) => {
  console.log('Processing order:', message.payload);
}, {
  queueGroup: 'order-processors'
});

await manager.publish('orders.process', {
  orderId: 'order-123',
  items: [{ id: 1, quantity: 2 }]
});
```

### Kafka Example

```typescript
import { MessageBrokerFactory } from '@wishyor/pubsub-adapters';
import { Kafka } from 'kafkajs';

const manager = await MessageBrokerFactory.createKafka(
  ['localhost:9092'],
  { Kafka }
);

await manager.connect();

// Subscribe with consumer group
await manager.subscribe('analytics.events', (message) => {
  console.log('Analytics event:', message.payload);
}, {
  consumerGroup: 'analytics-processors'
});

await manager.publish('analytics.events', {
  event: 'page_view',
  userId: 456,
  page: '/dashboard'
});
```

## Advanced Usage

### Message Handlers and Middleware

```typescript
import { 
  UniversalMessageManager,
  LoggingHandler,
  ValidationHandler,
  RetryHandler
} from '@wishyor/pubsub-adapters';

// Register message handlers
manager.registerHandler('user.created', new ValidationHandler({
  schema: {
    userId: 'number',
    email: 'string'
  }
}));

manager.registerHandler('order.process', new RetryHandler({
  maxRetries: 3,
  backoffMs: 1000
}));

// Add global middleware
manager.addMiddleware(async (message, next) => {
  console.log(`Processing message: ${message.type}`);
  const start = Date.now();
  
  await next();
  
  console.log(`Processed in ${Date.now() - start}ms`);
});
```

### Performance Monitoring

```typescript
// Get real-time metrics
const metrics = manager.getPerformanceMetrics();
console.log('Latency stats:', metrics.latency);
console.log('Throughput:', metrics.throughput);
console.log('Error rates:', metrics.errors);

// Monitor queue sizes
const queueSizes = manager.getQueueSizes();
console.log('Queue sizes:', queueSizes);

// Check broker health
const isHealthy = manager.isConnected();
console.log('Broker connected:', isHealthy);
```

### Circuit Breaker and Health Checks

```typescript
import { CircuitBreaker, HealthChecker } from '@wishyor/pubsub-adapters';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 30000,
  monitoringPeriod: 10000
});

const healthChecker = new HealthChecker();
healthChecker.addCheck('redis', async () => {
  return manager.isConnected();
});

// Monitor health
setInterval(async () => {
  const health = await healthChecker.checkAll();
  console.log('System health:', health);
}, 5000);
```

## API Reference

### UniversalMessageManager

The main class for managing message publishing and subscription.

#### Methods

- `connect(): Promise<void>` - Connect to the message broker
- `disconnect(): Promise<void>` - Disconnect from the message broker
- `publish(topic: string, payload: any, options?: Partial<IMessage>): Promise<void>` - Publish a message
- `publishImmediate(topic: string, payload: any, options?: Partial<IMessage>): Promise<void>` - Publish immediately bypassing queue
- `subscribe(topic: string, callback: Function, options?: SubscriptionOptions): Promise<string>` - Subscribe to messages
- `unsubscribe(topic: string, subscriptionId: string): Promise<boolean>` - Unsubscribe from messages
- `registerHandler(messageType: string, handler: IMessageHandler): void` - Register message handler
- `addMiddleware(middleware: Function): void` - Add middleware function
- `getPerformanceMetrics(): Record<string, any>` - Get performance metrics
- `getQueueSizes(): Record<string, number>` - Get queue sizes
- `isConnected(): boolean` - Check connection status

### MessageBrokerFactory

Factory class for creating message manager instances.

#### Static Methods

- `create(config: IBrokerConfig, dependencies: any): Promise<UniversalMessageManager>` - Create manager with config
- `createRedis(host: string, port: number, redis: any, options?: any): Promise<UniversalMessageManager>` - Create Redis manager
- `createNATS(urls: string[], nats: any, options?: any): Promise<UniversalMessageManager>` - Create NATS manager
- `createKafka(brokers: string[], kafkajs: any, options?: any): Promise<UniversalMessageManager>` - Create Kafka manager

## Configuration

### Broker Configuration

```typescript
interface IBrokerConfig {
  type: 'redis' | 'nats' | 'kafka';
  connection: {
    url?: string;
    urls?: string[];
    host?: string;
    port?: number;
    options?: Record<string, any>;
  };
  features?: {
    persistence?: boolean;
    clustering?: boolean;
    partitioning?: boolean;
    durability?: boolean;
  };
}
```

### Message Interface

```typescript
interface IMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
  headers?: Record<string, string>;
  partition?: string;  // Kafka
  subject?: string;    // NATS
  channel?: string;    // Redis
}
```

## Broker Support Status

| Broker | Status | Notes |
|--------|--------|---------|
| Redis | ✅ **Production Ready** | Fully tested and stable |
| Kafka | ✅ **Production Ready** | Fully tested with partitioning support |
| NATS | 🚧 **Beta** | Basic functionality, use with caution in production |

## Performance Optimization

### Best Practices

1. **Connection Pooling**: Reuse manager instances across your application
2. **Batch Publishing**: Use `publishImmediate()` for time-sensitive messages
3. **Queue Management**: Monitor queue sizes and adjust processing intervals
4. **Error Handling**: Implement proper error handling and retry logic
5. **Monitoring**: Use built-in metrics for performance tuning

### Benchmarks

| Broker | Status | Throughput (msg/s) | Latency (ms) | Memory (MB) |
|--------|--------|-------------------|--------------|-------------|
| Redis  | ✅ Stable | 50,000+           | < 1          | 25          |
| Kafka  | ✅ Stable | 75,000+           | < 2          | 35          |
| NATS   | 🚧 Beta | 100,000+          | < 0.5        | 20          |

## Examples

See the [examples](./examples) directory for complete working examples:

- [Basic Usage](./examples/basic-usage.ts)
- [Advanced Patterns](./examples/advanced-patterns.ts)
- [Performance Testing](./examples/performance-test.ts)
- [Error Handling](./examples/error-handling.ts)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Issue Tracker](https://github.com/wishyor/wishyor-pubsub-adepters/issues)