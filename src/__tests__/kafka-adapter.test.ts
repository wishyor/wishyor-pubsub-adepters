/**
 * Tests for KafkaAdapter
 */

import { KafkaAdapter } from '../adapter/kafka';
import { IBrokerConfig } from '../types';

describe('KafkaAdapter', () => {
  let adapter: KafkaAdapter;
  let mockKafka: jest.Mock;
  let mockProducer: any;
  let mockConsumer: any;
  let config: IBrokerConfig;

  beforeEach(() => {
    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue([]),
      _isConnected: true,
    };

    mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    };

    mockKafka = jest.fn().mockImplementation(() => ({
      producer: jest.fn().mockReturnValue(mockProducer),
      consumer: jest.fn().mockReturnValue(mockConsumer),
    }));

    config = {
      type: 'kafka',
      connection: {
        urls: ['localhost:9092'],
      },
      features: {
        persistence: true,
        partitioning: true,
      },
    };

    adapter = new KafkaAdapter(config, mockKafka);
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect to Kafka', async () => {
      await adapter.connect();
      expect(mockKafka).toHaveBeenCalledWith({
        clientId: 'universal-message-broker',
        brokers: ['localhost:9092'],
      });
      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it('should disconnect from Kafka', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it('should return correct broker type', () => {
      expect(adapter.getType()).toBe('kafka');
    });

    it('should check connection status', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('Message Publishing', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should publish messages', async () => {
      const message = {
        id: 'msg-123',
        type: 'test',
        payload: { data: 'test' },
        timestamp: Date.now(),
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [
          {
            key: 'msg-123',
            value: JSON.stringify(message),
            partition: undefined,
            headers: undefined,
          },
        ],
      });
    });

    it('should publish messages with partition', async () => {
      const message = {
        id: 'msg-123',
        type: 'test',
        payload: { data: 'test' },
        timestamp: Date.now(),
        partition: '2',
      };

      await adapter.publish('test-topic', message);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [
          {
            key: 'msg-123',
            value: JSON.stringify(message),
            partition: 2,
            headers: undefined,
          },
        ],
      });
    });
  });

  describe('Message Subscription', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should subscribe to topics', async () => {
      const callback = jest.fn();
      const subscriptionId = await adapter.subscribe('test-topic', callback);

      expect(subscriptionId).toMatch(/^kafka_sub_/);
      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false,
      });
      expect(mockConsumer.run).toHaveBeenCalled();
    });

    it('should subscribe with consumer group', async () => {
      const callback = jest.fn();
      const options = { consumerGroup: 'test-group' };

      await adapter.subscribe('test-topic', callback, options);

      const kafkaInstance = mockKafka.mock.results[0]?.value;
      expect(kafkaInstance.consumer).toHaveBeenCalledWith({
        groupId: 'test-group',
      });
    });

    it('should unsubscribe from topics', async () => {
      const callback = jest.fn();
      const subscriptionId = await adapter.subscribe('test-topic', callback);
      const result = await adapter.unsubscribe(subscriptionId);

      expect(result).toBe(true);
      expect(mockConsumer.disconnect).toHaveBeenCalled();
    });

    it('should return false for invalid subscription ID', async () => {
      const result = await adapter.unsubscribe('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should return broker metrics', async () => {
      const metrics = await adapter.getMetrics();

      expect(metrics).toEqual({
        connections: 1,
        messagesPublished: 0,
        messagesReceived: 0,
        errors: 0,
        latency: { avg: 0, min: 0, max: 0 },
        consumers_count: 0,
        subscriptions_count: 0,
      });
    });
  });
});
