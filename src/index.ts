/**
 * @wishyor/pubsub-adapters - Universal pub/sub message broker adapters
 * 
 * A production-ready TypeScript library providing unified interfaces for
 * Redis, NATS, and Kafka message brokers with built-in performance monitoring,
 * circuit breakers, and retry mechanisms.
 * 
 * @author Wishyor Team
 * @license MIT
 * @version 1.0.0
 */

// Core exports
export { UniversalMessageManager } from './universal/message.manager';
export { MessageBrokerFactory } from './factory/message.broker';

// Adapter exports
export { RedisAdapter } from './adapter/redis';
export { NATSAdapter } from './adapter/nats';
export { KafkaAdapter } from './adapter/kafka';

// Universal components
export { UniversalMessageQueue } from './universal/message.queue';
export { UniversalSubscriptionManager } from './universal/subscription.manager';
export { UniversalHandlerRegistry } from './universal/message.handler';
export { UniversalPerformanceMonitor } from './universal/performance.monitor';

// Message handlers
export { LoggingHandler } from './handlers/logging.handler';
export { ValidationHandler } from './handlers/validation.handler';
export { TransformHandler } from './handlers/transform.handler';
export { RetryHandler } from './handlers/retry.handler';

// Utilities
export { MessageBuilder } from './utils/message.builder';
export { HealthChecker } from './utils/health.checker';
export { CircuitBreaker } from './utils/circuit.breaker';
export { IntegrationHelper } from './helper/Integration.helper';

// Type exports
export type {
  IMessage,
  ISubscription,
  IMessageHandler,
  IBrokerAdapter,
  IBrokerConfig,
  MessageCallback,
  MessageFilters,
  MessagePriority,
  BrokerType,
  SubscriptionOptions,
  BrokerMetrics,
  ConnectionConfig,
  BrokerFeatures,
  PerformanceConfig,
  MiddlewareFunction,
  PerformanceMetrics,
  HealthCheckResult,
  CircuitBreakerConfig,
  RetryConfig,
  ValidationSchema,
  LoggingConfig,
  DLQConfig,
} from './types';

export { ErrorType, BrokerError, CircuitBreakerState } from './types';

// Default export for CommonJS compatibility
import { UniversalMessageManager as UMM } from './universal/message.manager';
import { MessageBrokerFactory as MBF } from './factory/message.broker';
import { RedisAdapter as RA } from './adapter/redis';
import { NATSAdapter as NA } from './adapter/nats';
import { KafkaAdapter as KA } from './adapter/kafka';
import { UniversalMessageQueue as UMQ } from './universal/message.queue';
import { UniversalSubscriptionManager as USM } from './universal/subscription.manager';
import { UniversalHandlerRegistry as UHR } from './universal/message.handler';
import { UniversalPerformanceMonitor as UPM } from './universal/performance.monitor';
import { LoggingHandler as LH } from './handlers/logging.handler';
import { ValidationHandler as VH } from './handlers/validation.handler';
import { TransformHandler as TH } from './handlers/transform.handler';
import { RetryHandler as RH } from './handlers/retry.handler';
import { MessageBuilder as MB } from './utils/message.builder';
import { HealthChecker as HC } from './utils/health.checker';
import { CircuitBreaker as CB } from './utils/circuit.breaker';
import { IntegrationHelper as IH } from './helper/Integration.helper';

export default {
  UniversalMessageManager: UMM,
  MessageBrokerFactory: MBF,
  RedisAdapter: RA,
  NATSAdapter: NA,
  KafkaAdapter: KA,
  UniversalMessageQueue: UMQ,
  UniversalSubscriptionManager: USM,
  UniversalHandlerRegistry: UHR,
  UniversalPerformanceMonitor: UPM,
  LoggingHandler: LH,
  ValidationHandler: VH,
  TransformHandler: TH,
  RetryHandler: RH,
  MessageBuilder: MB,
  HealthChecker: HC,
  CircuitBreaker: CB,
  IntegrationHelper: IH,
};
