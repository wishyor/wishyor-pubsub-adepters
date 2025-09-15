import { IBrokerAdapter, IBrokerConfig, IMessage, ISubscription, IMessageHandler } from '@/types';
import { UniversalHandlerRegistry } from './message.handler';
import { UniversalMessageQueue } from './message.queue';
import { UniversalPerformanceMonitor } from './performance.monitor';
import { UniversalSubscriptionManager } from './subscription.manager';

/**
 * Universal message manager that provides a unified interface for message brokers
 * with built-in queuing, subscription management, and performance monitoring.
 *
 * @example
 * ```typescript
 * const adapter = new RedisAdapter();
 * const config = { features: { persistence: true } };
 * const manager = new UniversalMessageManager(adapter, config);
 *
 * await manager.connect();
 *
 * // Subscribe to messages
 * const subId = await manager.subscribe('user.events', (msg) => {
 *   console.log('Received:', msg.payload);
 * });
 *
 * // Publish a message
 * await manager.publish('user.events', { userId: 123, action: 'login' });
 * ```
 */
export class UniversalMessageManager {
  private adapter: IBrokerAdapter;
  private subscriptionManager = new UniversalSubscriptionManager();
  private messageQueue = new UniversalMessageQueue();
  private handlerRegistry = new UniversalHandlerRegistry();
  private performanceMonitor = new UniversalPerformanceMonitor();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private config: IBrokerConfig;

  /**
   * Creates a new UniversalMessageManager instance.
   *
   * @param adapter - The broker adapter implementation
   * @param config - Configuration options for the message manager
   */
  constructor(adapter: IBrokerAdapter, config: IBrokerConfig) {
    this.adapter = adapter;
    this.config = config;
    this.setupMessageHandling();
  }

  private setupMessageHandling(): void {}

  /**
   * Establishes connection to the message broker and starts processing queues.
   * Also sets up periodic metrics collection if supported by the adapter.
   *
   * @example
   * ```typescript
   * await manager.connect();
   * console.log('Connected to broker:', manager.getBrokerType());
   * ```
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
    this.startProcessing();

    if (this.adapter.getMetrics) {
      setInterval(async () => {
        try {
          const metrics = await this.adapter.getMetrics!();
          this.performanceMonitor.recordBrokerMetrics(this.adapter.getType(), metrics);
        } catch (error) {
          console.error('Failed to collect broker metrics:', error);
        }
      }, 30000);
    }
  }

  /**
   * Disconnects from the message broker and stops all processing.
   */
  async disconnect(): Promise<void> {
    this.stopProcessing();
    await this.adapter.disconnect();
  }

  private startProcessing(): void {
    if (this.processingInterval) return;

    const interval = this.config.features?.persistence ? 10 : 1;

    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) return;

      this.isProcessing = true;
      try {
        await this.processQueues();
      } finally {
        this.isProcessing = false;
      }
    }, interval);
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  private async processQueues(): Promise<void> {
    const topics = this.subscriptionManager.getAllTopics();

    for (const topic of topics) {
      const message = await this.messageQueue.dequeue(topic);
      if (message) {
        const startTime = Date.now();
        try {
          await this.adapter.publish(topic, message);
          const latency = Date.now() - startTime;
          this.performanceMonitor.recordLatency('publish', latency, this.adapter.getType());
        } catch (error) {
          console.error(`Failed to publish message for topic ${topic}:`, error);

          await this.messageQueue.enqueue(topic, message);
        }
      }
    }
  }

  /**
   * Subscribes to messages on a specific topic with optional filtering.
   *
   * @param topic - The topic to subscribe to
   * @param callback - Function called when matching messages are received
   * @param options - Optional subscription configuration
   * @returns Subscription ID for later unsubscription
   *
   * @example
   * ```typescript
   * const subId = await manager.subscribe('orders', (msg) => {
   *   console.log('Order received:', msg.payload);
   * }, {
   *   filters: { status: 'pending' },
   *   consumerGroup: 'order-processors'
   * });
   * ```
   */
  async subscribe(
    topic: string,
    callback: (message: IMessage) => void,
    options?: {
      filters?: Record<string, any>;
      consumerGroup?: string;
      queueGroup?: string;
    }
  ): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: ISubscription = {
      id: subscriptionId,
      topic,
      callback: async (message: IMessage) => {
        const startTime = Date.now();
        try {
          if (this.subscriptionManager.matchesFilters(message, options?.filters)) {
            await this.handlerRegistry.handle(message);
            callback(message);
          }
        } catch (error) {
          console.error(`Subscription callback error for ${subscriptionId}:`, error);
        } finally {
          const latency = Date.now() - startTime;
          this.performanceMonitor.recordLatency('subscription', latency, this.adapter.getType());
        }
      },
      filters: options?.filters,
      consumerGroup: options?.consumerGroup,
      queueGroup: options?.queueGroup,
    };

    this.subscriptionManager.subscribe(subscription);

    await this.adapter.subscribe(topic, subscription.callback, {
      consumerGroup: options?.consumerGroup,
      queueGroup: options?.queueGroup,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribes from a topic using the subscription ID.
   *
   * @param topic - The topic to unsubscribe from
   * @param subscriptionId - The subscription ID returned from subscribe()
   * @returns True if successfully unsubscribed, false if subscription not found
   */
  async unsubscribe(topic: string, subscriptionId: string): Promise<boolean> {
    const removed = this.subscriptionManager.unsubscribe(topic, subscriptionId);
    if (removed) {
      await this.adapter.unsubscribe(subscriptionId);
    }
    return removed;
  }

  /**
   * Publishes a message to a topic via the internal queue for guaranteed delivery.
   *
   * @param topic - The topic to publish to
   * @param payload - The message payload
   * @param options - Optional message properties
   *
   * @example
   * ```typescript
   * await manager.publish('notifications', {
   *   userId: 123,
   *   message: 'Welcome!'
   * }, {
   *   priority: 'high',
   *   metadata: { source: 'auth-service' }
   * });
   * ```
   */
  async publish(topic: string, payload: any, options?: Partial<IMessage>): Promise<void> {
    const message: IMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: topic,
      payload,
      timestamp: Date.now(),
      ...options,
    };

    await this.messageQueue.enqueue(topic, message);
  }

  /**
   * Publishes a message directly to the broker, bypassing the internal queue.
   * Use for time-sensitive messages where immediate delivery is required.
   *
   * @param topic - The topic to publish to
   * @param payload - The message payload
   * @param options - Optional message properties
   */
  async publishImmediate(topic: string, payload: any, options?: Partial<IMessage>): Promise<void> {
    const message: IMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: topic,
      payload,
      timestamp: Date.now(),
      ...options,
    };

    const startTime = Date.now();
    await this.adapter.publish(topic, message);
    const latency = Date.now() - startTime;
    this.performanceMonitor.recordLatency('publish_immediate', latency, this.adapter.getType());
  }

  /**
   * Registers a handler for a specific message type.
   *
   * @param messageType - The message type to handle
   * @param handler - The handler implementation
   */
  registerHandler(messageType: string, handler: IMessageHandler): void {
    this.handlerRegistry.register(messageType, handler);
  }

  /**
   * Registers a global handler that processes all message types.
   *
   * @param handler - The global handler implementation
   */
  registerGlobalHandler(handler: IMessageHandler): void {
    this.handlerRegistry.registerGlobal(handler);
  }

  /**
   * Adds middleware that runs before message handlers.
   *
   * @param middleware - The middleware function
   */
  addMiddleware(middleware: (message: IMessage, next: () => Promise<void>) => Promise<void>): void {
    this.handlerRegistry.addMiddleware(middleware);
  }

  /**
   * Returns current performance metrics including latency and throughput data.
   *
   * @returns Object containing performance metrics
   */
  getPerformanceMetrics(): Record<string, any> {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Gets the current queue sizes for all subscribed topics.
   *
   * @returns Object mapping topic names to queue sizes
   */
  getQueueSizes(): Record<string, number> {
    const topics = this.subscriptionManager.getAllTopics();
    const sizes: Record<string, number> = {};

    for (const topic of topics) {
      sizes[topic] = this.messageQueue.getQueueSize(topic);
    }

    return sizes;
  }

  /**
   * Returns the type of the underlying message broker adapter.
   *
   * @returns The broker type (e.g., 'redis', 'rabbitmq', 'kafka')
   */
  getBrokerType(): string {
    return this.adapter.getType();
  }

  /**
   * Checks if the manager is currently connected to the broker.
   *
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  /**
   * Retrieves messages from the Dead Letter Queue for a specific topic.
   *
   * @param topic - The topic to get DLQ messages for
   * @returns Array of messages that failed processing
   */
  getDLQMessages(topic: string): IMessage[] {
    return this.messageQueue.getDLQMessages(topic);
  }
}
