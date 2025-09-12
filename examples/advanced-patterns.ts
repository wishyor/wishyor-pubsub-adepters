/**
 * Advanced usage patterns for @wishyor/pubsub-adapters
 */

import {
  MessageBrokerFactory,
  ValidationHandler,
  RetryHandler,
  LoggingHandler,
  CircuitBreaker,
  HealthChecker,
} from '../src';
import Redis from 'ioredis';

interface OrderEvent {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

async function advancedPatterns(): Promise<void> {
  const manager = await MessageBrokerFactory.createRedis('localhost', 6379, Redis);
  await manager.connect();

  // Register validation handler for order events
  manager.registerHandler('order.created', new ValidationHandler({
    schema: {
      orderId: 'string',
      customerId: 'string',
      items: 'array',
      total: 'number',
      status: 'string',
    },
  }));

  // Register retry handler for payment processing
  manager.registerHandler('payment.process', new RetryHandler({
    maxRetries: 3,
    backoffMs: 1000,
    exponentialBackoff: true,
  }));

  // Add global logging middleware
  manager.addMiddleware(async (message, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Processing message: ${message.type}`);
    
    try {
      await next();
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Completed ${message.type} in ${duration}ms`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing ${message.type}:`, error);
      throw error;
    }
  });

  // Subscribe to order events with filtering
  await manager.subscribe('order.events', (message) => {
    const order = message.payload as OrderEvent;
    console.log(`Processing order ${order.orderId} for customer ${order.customerId}`);
    
    // Simulate order processing
    if (order.total > 1000) {
      console.log('High-value order detected, triggering additional verification');
    }
  }, {
    filters: {
      status: 'pending',
    },
  });

  // Subscribe to payment events with consumer group
  await manager.subscribe('payment.events', async (message) => {
    const payment = message.payload;
    console.log('Processing payment:', payment);
    
    // Simulate payment processing with potential failure
    if (Math.random() < 0.1) {
      throw new Error('Payment processing failed');
    }
    
    console.log('Payment processed successfully');
  }, {
    consumerGroup: 'payment-processors',
  });

  // Publish sample order
  await manager.publish('order.events', {
    orderId: 'order-123',
    customerId: 'customer-456',
    items: [
      { productId: 'prod-1', quantity: 2, price: 29.99 },
      { productId: 'prod-2', quantity: 1, price: 49.99 },
    ],
    total: 109.97,
    status: 'pending',
  } as OrderEvent, {
    priority: 'high',
    metadata: {
      source: 'web-checkout',
      timestamp: Date.now(),
    },
  });

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  await manager.disconnect();
}

async function circuitBreakerExample(): Promise<void> {
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeout: 5000,
    monitoringPeriod: 1000,
  });

  const manager = await MessageBrokerFactory.createRedis('localhost', 6379, Redis);
  await manager.connect();

  // Simulate service with potential failures
  const unreliableService = async (data: unknown): Promise<void> => {
    if (Math.random() < 0.7) {
      throw new Error('Service temporarily unavailable');
    }
    console.log('Service call successful:', data);
  };

  await manager.subscribe('service.calls', async (message) => {
    try {
      await circuitBreaker.execute(() => unreliableService(message.payload));
    } catch (error) {
      console.error('Circuit breaker prevented call or service failed:', error);
    }
  });

  // Publish test messages
  for (let i = 0; i < 10; i++) {
    await manager.publish('service.calls', { requestId: i });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await manager.disconnect();
}

async function healthCheckExample(): Promise<void> {
  const healthChecker = new HealthChecker();
  const manager = await MessageBrokerFactory.createRedis('localhost', 6379, Redis);
  
  await manager.connect();

  // Add health checks
  healthChecker.addCheck('redis-connection', async () => {
    return manager.isConnected();
  });

  healthChecker.addCheck('queue-sizes', async () => {
    const queueSizes = manager.getQueueSizes();
    const totalMessages = Object.values(queueSizes).reduce((sum, size) => sum + size, 0);
    return totalMessages < 1000; // Healthy if less than 1000 queued messages
  });

  healthChecker.addCheck('performance', async () => {
    const metrics = manager.getPerformanceMetrics();
    return metrics.latency?.avg < 100; // Healthy if average latency < 100ms
  });

  // Monitor health periodically
  const healthInterval = setInterval(async () => {
    const health = await healthChecker.checkAll();
    console.log('System health:', {
      overall: health.every(check => check.healthy),
      checks: health,
    });
  }, 5000);

  // Run for 30 seconds
  setTimeout(() => {
    clearInterval(healthInterval);
    manager.disconnect();
  }, 30000);
}

// Run examples
if (require.main === module) {
  Promise.all([
    advancedPatterns(),
    circuitBreakerExample(),
    healthCheckExample(),
  ]).catch(console.error);
}