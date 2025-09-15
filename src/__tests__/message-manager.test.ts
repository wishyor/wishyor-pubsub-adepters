/**
 * Tests for UniversalMessageManager
 */

import { UniversalMessageManager } from '../universal/message.manager';
import { RedisAdapter } from '../adapter/redis';
import { IBrokerConfig } from '../types';

describe('UniversalMessageManager', () => {
  let manager: UniversalMessageManager;
  let mockAdapter: jest.Mocked<RedisAdapter>;
  let config: IBrokerConfig;

  beforeEach(() => {
    config = {
      type: 'redis',
      connection: {
        host: 'localhost',
        port: 6379,
      },
      features: {
        persistence: true,
      },
    };

    mockAdapter = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue('sub-123'),
      unsubscribe: jest.fn().mockResolvedValue(true),
      isConnected: jest.fn().mockReturnValue(true),
      getType: jest.fn().mockReturnValue('redis'),
      getMetrics: jest.fn().mockResolvedValue({
        connections: 1,
        messagesPublished: 10,
        messagesReceived: 8,
        errors: 0,
        latency: { avg: 5, min: 1, max: 10 },
      }),
    } as any;

    manager = new UniversalMessageManager(mockAdapter, config);
  });

  afterEach(async () => {
    if (manager.isConnected()) {
      await manager.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect to the broker', async () => {
      await manager.connect();
      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(manager.isConnected()).toBe(true);
    });

    it('should disconnect from the broker', async () => {
      await manager.connect();
      await manager.disconnect();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });

    it('should return correct broker type', () => {
      expect(manager.getBrokerType()).toBe('redis');
    });
  });

  describe('Message Publishing', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should publish messages to queue', async () => {
      const payload = { userId: 123, action: 'login' };
      await manager.publish('user.events', payload);

      // Message should be queued, not immediately published
      expect(mockAdapter.publish).not.toHaveBeenCalled();
    });

    it('should publish messages immediately when requested', async () => {
      const payload = { userId: 123, action: 'login' };
      await manager.publishImmediate('user.events', payload);

      expect(mockAdapter.publish).toHaveBeenCalledWith(
        'user.events',
        expect.objectContaining({
          type: 'user.events',
          payload,
          timestamp: expect.any(Number),
          id: expect.any(String),
        })
      );
    });

    it('should include message options in published message', async () => {
      const payload = { userId: 123 };
      const options = {
        priority: 'high' as const,
        metadata: { source: 'test' },
      };

      await manager.publishImmediate('user.events', payload, options);

      expect(mockAdapter.publish).toHaveBeenCalledWith(
        'user.events',
        expect.objectContaining({
          priority: 'high',
          metadata: { source: 'test' },
        })
      );
    });
  });

  describe('Message Subscription', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should subscribe to topics', async () => {
      const callback = jest.fn();
      const subscriptionId = await manager.subscribe('user.events', callback);

      expect(subscriptionId).toMatch(/^sub_/);
      expect(mockAdapter.subscribe).toHaveBeenCalledWith('user.events', expect.any(Function), {});
    });

    it('should subscribe with options', async () => {
      const callback = jest.fn();
      const options = {
        consumerGroup: 'processors',
        filters: { status: 'active' },
      };

      await manager.subscribe('user.events', callback, options);

      expect(mockAdapter.subscribe).toHaveBeenCalledWith('user.events', expect.any(Function), {
        consumerGroup: 'processors',
      });
    });

    it('should unsubscribe from topics', async () => {
      const callback = jest.fn();
      const subscriptionId = await manager.subscribe('user.events', callback);
      const result = await manager.unsubscribe('user.events', subscriptionId);

      expect(result).toBe(true);
      expect(mockAdapter.unsubscribe).toHaveBeenCalledWith(subscriptionId);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should return performance metrics', () => {
      const metrics = manager.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should return queue sizes', () => {
      const queueSizes = manager.getQueueSizes();
      expect(queueSizes).toBeDefined();
      expect(typeof queueSizes).toBe('object');
    });
  });

  describe('Message Handlers', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should register message handlers', () => {
      const handler = {
        handle: jest.fn(),
        canHandle: jest.fn().mockReturnValue(true),
        priority: 1,
      };

      manager.registerHandler('user.created', handler);
      // Handler registration should not throw
      expect(handler.canHandle).toBeDefined();
    });

    it('should register global handlers', () => {
      const handler = {
        handle: jest.fn(),
        canHandle: jest.fn().mockReturnValue(true),
      };

      manager.registerGlobalHandler(handler);
      // Global handler registration should not throw
      expect(handler.canHandle).toBeDefined();
    });

    it('should add middleware', () => {
      const middleware = jest.fn().mockImplementation(async (message, next) => {
        await next();
      });

      manager.addMiddleware(middleware);
      // Middleware addition should not throw
      expect(middleware).toBeDefined();
    });
  });

  describe('Dead Letter Queue', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should return DLQ messages', () => {
      const dlqMessages = manager.getDLQMessages('user.events');
      expect(Array.isArray(dlqMessages)).toBe(true);
    });
  });
});
