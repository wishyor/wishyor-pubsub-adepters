/**
 * Priority levels for messages in order of importance
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Supported message broker types
 */
export type BrokerType = 'redis' | 'nats' | 'kafka';

/**
 * Represents a generic message interface that can be used across different messaging systems.
 * 
 * @template T - The type of the payload. Defaults to unknown for better type safety.
 * 
 * @property {string} id - Unique identifier for the message
 * @property {string} type - Type/category of the message
 * @property {T} payload - The actual content/data of the message
 * @property {number} timestamp - Unix timestamp when the message was created
 * @property {MessagePriority} [priority] - Optional priority level of the message
 * @property {Record<string, unknown>} [metadata] - Optional key-value pairs for additional message metadata
 * @property {Record<string, string>} [headers] - Optional key-value pairs for message headers
 * @property {string} [partition] - Optional partition key for Kafka messaging
 * @property {string} [subject] - Optional subject for NATS messaging
 * @property {string} [channel] - Optional channel name for Redis pub/sub
 */
export interface IMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  priority?: MessagePriority;
  metadata?: Readonly<Record<string, unknown>>;
  headers?: Readonly<Record<string, string>>;
  partition?: string; // For Kafka
  subject?: string; // For NATS
  channel?: string; // For Redis
}

/**
 * Message callback function type
 */
export type MessageCallback<T = unknown> = (message: IMessage<T>) => void | Promise<void>;

/**
 * Message filter criteria
 */
export type MessageFilters = Record<string, unknown>;

/**
 * Represents a subscription configuration for messaging systems.
 * 
 * @template T - The expected payload type for messages
 * @property {string} id - Unique identifier for the subscription
 * @property {string} topic - The topic or channel to subscribe to
 * @property {MessageFilters} [filters] - Optional filtering criteria for messages
 * @property {MessageCallback<T>} callback - Function to handle received messages
 * @property {number} [priority] - Optional priority level for the subscription
 * @property {string} [consumerGroup] - Optional Kafka consumer group identifier
 * @property {string} [queueGroup] - Optional NATS queue group identifier
 */
export interface ISubscription<T = unknown> {
  readonly id: string;
  readonly topic: string;
  readonly filters?: MessageFilters;
  readonly callback: MessageCallback<T>;
  readonly priority?: number;
  readonly consumerGroup?: string; // For Kafka
  readonly queueGroup?: string; // For NATS
}

/**
 * Interface for message handlers that process messages in the system.
 * @template T - The type of message data to be handled. Defaults to unknown.
 */
export interface IMessageHandler<T = unknown> {
  /**
   * Handles the given message.
   * @param message - The message to be processed
   * @returns Promise<void> | void - Returns either a Promise that resolves to void, or void directly
   */
  handle(message: IMessage<T>): Promise<void> | void;

  /**
   * Determines if this handler can process the given message.
   * @param message - The message to check
   * @returns boolean - True if this handler can process the message, false otherwise
   */
  canHandle(message: IMessage<unknown>): boolean;

  /**
   * Optional priority level of the handler.
   * Higher numbers indicate higher priority.
   */
  readonly priority?: number;

  /**
   * Optional handler name for debugging and logging
   */
  readonly name?: string;
}

/**
 * Subscription options for broker adapters
 */
export interface SubscriptionOptions {
  readonly consumerGroup?: string;
  readonly queueGroup?: string;
  readonly autoAck?: boolean;
  readonly maxRetries?: number;
  readonly [key: string]: unknown;
}

/**
 * Broker metrics interface
 */
export interface BrokerMetrics {
  readonly connections: number;
  readonly messagesPublished: number;
  readonly messagesReceived: number;
  readonly errors: number;
  readonly latency: {
    readonly avg: number;
    readonly min: number;
    readonly max: number;
  };
  readonly [key: string]: unknown;
}

/**
 * Interface representing a message broker adapter.
 * Provides methods for connecting, publishing, and subscribing to a message broker.
 */
export interface IBrokerAdapter {
  /**
   * Establishes connection with the message broker.
   * @returns Promise that resolves when connection is established.
   */
  connect(): Promise<void>;

  /**
   * Terminates connection with the message broker.
   * @returns Promise that resolves when disconnection is complete.
   */
  disconnect(): Promise<void>;

  /**
   * Publishes a message to specified topic.
   * @param topic - The topic/channel to publish the message to
   * @param message - The message payload to publish
   * @returns Promise that resolves when message is published
   */
  publish(topic: string, message: IMessage): Promise<void>;

  /**
   * Subscribes to messages on specified topic.
   * @param topic - The topic/channel to subscribe to
   * @param callback - Callback function executed when message is received
   * @param options - Optional configuration parameters for subscription
   * @returns Promise that resolves to subscription identifier
   */
  subscribe(
    topic: string,
    callback: MessageCallback,
    options?: SubscriptionOptions
  ): Promise<string>;

  /**
   * Unsubscribes from previously subscribed topic.
   * @param subscriptionId - The subscription identifier to unsubscribe
   * @returns Promise that resolves to boolean indicating success
   */
  unsubscribe(subscriptionId: string): Promise<boolean>;

  /**
   * Checks if broker connection is active.
   * @returns Boolean indicating connection status
   */
  isConnected(): boolean;

  /**
   * Gets the type of message broker being used.
   * @returns The broker type
   */
  getType(): BrokerType;

  /**
   * Optional method to retrieve broker metrics.
   * @returns Promise that resolves to broker metrics
   */
  getMetrics?(): Promise<BrokerMetrics>;

  /**
   * Optional method to get connection health status
   * @returns Promise that resolves to health status
   */
  getHealth?(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
}

/**
 * Connection configuration for message brokers
 */
export interface ConnectionConfig {
  readonly url?: string;
  readonly urls?: readonly string[];
  readonly host?: string;
  readonly port?: number;
  readonly username?: string;
  readonly password?: string;
  readonly ssl?: boolean;
  readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * Feature flags for broker capabilities
 */
export interface BrokerFeatures {
  readonly persistence?: boolean;
  readonly clustering?: boolean;
  readonly partitioning?: boolean;
  readonly durability?: boolean;
  readonly transactions?: boolean;
  readonly deadLetterQueue?: boolean;
}

/**
 * Performance configuration options
 */
export interface PerformanceConfig {
  readonly batchSize?: number;
  readonly flushInterval?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly connectionTimeout?: number;
  readonly requestTimeout?: number;
}

/**
 * Complete broker configuration interface
 */
export interface IBrokerConfig {
  readonly type: BrokerType;
  readonly connection: ConnectionConfig;
  readonly features?: BrokerFeatures;
  readonly performance?: PerformanceConfig;
  readonly clientId?: string;
  readonly debug?: boolean;
}

/**
 * Middleware function type for message processing
 */
export type MiddlewareFunction = (
  message: IMessage,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Error types that can occur in the system
 */
export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  PUBLISH_ERROR = 'PUBLISH_ERROR',
  SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER_ERROR = 'CIRCUIT_BREAKER_ERROR',
}

/**
 * Custom error class for broker operations
 */
export class BrokerError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly brokerType: BrokerType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BrokerError';
  }
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  readonly latency: {
    readonly publish: number[];
    readonly subscription: number[];
    readonly avg: number;
    readonly p95: number;
    readonly p99: number;
  };
  readonly throughput: {
    readonly messagesPerSecond: number;
    readonly bytesPerSecond: number;
  };
  readonly errors: {
    readonly total: number;
    readonly byType: Record<ErrorType, number>;
    readonly rate: number;
  };
  readonly connections: {
    readonly active: number;
    readonly total: number;
  };
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  readonly name: string;
  readonly healthy: boolean;
  readonly message?: string;
  readonly timestamp: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly recoveryTimeout: number;
  readonly monitoringPeriod: number;
  readonly halfOpenMaxCalls?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly jitter?: boolean;
}

/**
 * Message validation schema
 */
export interface ValidationSchema {
  readonly [key: string]: 'string' | 'number' | 'boolean' | 'object' | 'array' | ValidationSchema;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format?: 'json' | 'text';
  readonly includeMetadata?: boolean;
}

/**
 * Dead letter queue configuration
 */
export interface DLQConfig {
  readonly enabled: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly topic?: string;
}