/**
 * Basic usage examples for @wishyor/pubsub-adapters
 */

import { MessageBrokerFactory } from '../src';
import Redis from 'ioredis';

async function redisExample(): Promise<void> {
  // Create Redis message manager
  const manager = await MessageBrokerFactory.createRedis(
    'localhost',
    6379,
    Redis,
    {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    }
  );

  await manager.connect();

  // Subscribe to user events
  const subscriptionId = await manager.subscribe('user.events', (message) => {
    console.log('User event received:', {
      id: message.id,
      type: message.type,
      payload: message.payload,
      timestamp: new Date(message.timestamp).toISOString(),
    });
  });

  // Publish user registration event
  await manager.publish('user.events', {
    userId: 12345,
    action: 'register',
    email: 'user@example.com',
    metadata: {
      source: 'web',
      userAgent: 'Mozilla/5.0...',
    },
  }, {
    priority: 'high',
    headers: {
      'content-type': 'application/json',
      'source-service': 'auth-service',
    },
  });

  // Publish user login event
  await manager.publish('user.events', {
    userId: 12345,
    action: 'login',
    timestamp: Date.now(),
  });

  // Wait for messages to be processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  await manager.unsubscribe('user.events', subscriptionId);
  await manager.disconnect();
}

async function performanceExample(): Promise<void> {
  const manager = await MessageBrokerFactory.createRedis('localhost', 6379, Redis);
  await manager.connect();

  // Subscribe to high-throughput events
  await manager.subscribe('analytics.events', (message) => {
    // Process analytics event
    console.log('Analytics:', message.payload);
  });

  // Simulate high-throughput publishing
  const startTime = Date.now();
  const messageCount = 1000;

  for (let i = 0; i < messageCount; i++) {
    await manager.publishImmediate('analytics.events', {
      eventType: 'page_view',
      userId: Math.floor(Math.random() * 10000),
      page: `/page-${i % 10}`,
      timestamp: Date.now(),
    });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const throughput = messageCount / (duration / 1000);

  console.log(`Published ${messageCount} messages in ${duration}ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);

  // Get performance metrics
  const metrics = manager.getPerformanceMetrics();
  console.log('Performance metrics:', metrics);

  await manager.disconnect();
}

// Run examples
if (require.main === module) {
  Promise.all([
    redisExample(),
    performanceExample(),
  ]).catch(console.error);
}