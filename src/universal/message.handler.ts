import { IMessageHandler, IMessage } from '@/types';

/**
 * Universal message handler registry that supports type-specific handlers, global handlers,
 * and middleware for processing messages in a flexible and extensible way.
 *
 * @example
 * ```typescript
 * // Create registry
 * const registry = new UniversalHandlerRegistry();
 *
 * // Add middleware for logging
 * registry.addMiddleware(async (message, next) => {
 *   console.log(`Processing message: ${message.type}`);
 *   await next();
 *   console.log(`Finished processing: ${message.type}`);
 * });
 *
 * // Register type-specific handler
 * const userHandler = {
 *   priority: 10,
 *   canHandle: (msg) => msg.userId != null,
 *   handle: async (msg) => console.log(`User message: ${msg.data}`)
 * };
 * registry.register('USER_ACTION', userHandler);
 *
 * // Register global handler (runs for all messages)
 * const auditHandler = {
 *   priority: 5,
 *   canHandle: () => true,
 *   handle: async (msg) => console.log(`Audit: ${msg.type} at ${Date.now()}`)
 * };
 * registry.registerGlobal(auditHandler);
 *
 * // Handle a message
 * await registry.handle({
 *   type: 'USER_ACTION',
 *   userId: 123,
 *   data: 'clicked button'
 * });
 * ```
 */
export class UniversalHandlerRegistry {
  /**
   * Map storing handlers grouped by message type
   * @private
   */
  private handlers = new Map<string, IMessageHandler[]>();

  /**
   * Array of global handlers that run for all message types
   * @private
   */
  private globalHandlers: IMessageHandler[] = [];

  /**
   * Array of middleware functions that run before handlers
   * @private
   */
  private middleware: ((message: IMessage, next: () => Promise<void>) => Promise<void>)[] = [];

  /**
   * Registers a handler for a specific message type. Handlers are automatically
   * sorted by priority (highest first).
   *
   * @param messageType - The type of message this handler should process
   * @param handler - The handler instance to register
   *
   * @example
   * ```typescript
   * const emailHandler = {
   *   priority: 10,
   *   canHandle: (msg) => msg.recipient != null,
   *   handle: async (msg) => {
   *     await sendEmail(msg.recipient, msg.content);
   *   }
   * };
   * registry.register('EMAIL', emailHandler);
   * ```
   */
  register(messageType: string, handler: IMessageHandler): void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    const handlers = this.handlers.get(messageType)!;
    handlers.push(handler);
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Registers a global handler that runs for all message types.
   * Global handlers are executed before type-specific handlers and are
   * automatically sorted by priority (highest first).
   *
   * @param handler - The global handler instance to register
   *
   * @example
   * ```typescript
   * const loggingHandler = {
   *   priority: 100,
   *   canHandle: () => true,
   *   handle: async (msg) => {
   *     console.log(`[${new Date().toISOString()}] ${msg.type}:`, msg);
   *   }
   * };
   * registry.registerGlobal(loggingHandler);
   * ```
   */
  registerGlobal(handler: IMessageHandler): void {
    this.globalHandlers.push(handler);
    this.globalHandlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Adds middleware that runs before any handlers are executed.
   * Middleware functions are executed in the order they were added.
   *
   * @param middleware - Middleware function that receives the message and next callback
   *
   * @example
   * ```typescript
   * // Authentication middleware
   * registry.addMiddleware(async (message, next) => {
   *   if (message.requiresAuth && !message.user) {
   *     throw new Error('Authentication required');
   *   }
   *   await next();
   * });
   *
   * // Rate limiting middleware
   * registry.addMiddleware(async (message, next) => {
   *   await rateLimiter.checkLimit(message.userId);
   *   await next();
   * });
   * ```
   */
  addMiddleware(middleware: (message: IMessage, next: () => Promise<void>) => Promise<void>): void {
    this.middleware.push(middleware);
  }

  /**
   * Processes a message through all registered middleware and handlers.
   *
   * The execution flow is:
   * 1. Middleware functions (in registration order)
   * 2. Global handlers (by priority, highest first)
   * 3. Type-specific handlers (by priority, highest first)
   *
   * All applicable handlers run in parallel using Promise.all().
   *
   * @param message - The message to process
   * @throws Will throw an error if any middleware or handler throws
   *
   * @example
   * ```typescript
   * const message = {
   *   type: 'ORDER_CREATED',
   *   orderId: '12345',
   *   userId: 'user123',
   *   amount: 99.99,
   *   timestamp: Date.now()
   * };
   *
   * try {
   *   await registry.handle(message);
   *   console.log('Message processed successfully');
   * } catch (error) {
   *   console.error('Failed to process message:', error);
   * }
   * ```
   */
  async handle(message: IMessage): Promise<void> {
    let index = 0;
    const next = async (): Promise<void> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        await middleware?.(message, next);
      } else {
        const handlers = this.handlers.get(message.type) || [];
        const allHandlers = [...this.globalHandlers, ...handlers];
        const promises = allHandlers.filter(h => h.canHandle(message)).map(h => h.handle(message));
        await Promise.all(promises);
      }
    };
    await next();
  }

  /**
   * Unregisters a specific handler for a message type.
   *
   * @param messageType - The message type to remove the handler from
   * @param handler - The handler instance to remove
   * @returns True if the handler was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const handler = { ... };
   * registry.register('USER_EVENT', handler);
   *
   * // Later, remove the handler
   * const removed = registry.unregister('USER_EVENT', handler);
   * if (removed) {
   *   console.log('Handler successfully removed');
   * } else {
   *   console.log('Handler not found');
   * }
   * ```
   */
  unregister(messageType: string, handler: IMessageHandler): boolean {
    const handlers = this.handlers.get(messageType);
    if (!handlers) return false;
    const index = handlers.indexOf(handler);
    if (index === -1) return false;
    handlers.splice(index, 1);
    return true;
  }
}
