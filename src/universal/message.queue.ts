import { IMessage } from '@/types';

/**
 * Priority-based message queue with Dead Letter Queue (DLQ) support.
 * Manages message ordering by priority and handles overflow situations.
 *
 * @example
 * ```typescript
 * const queue = new UniversalMessageQueue();
 *
 * // Enqueue messages with different priorities
 * await queue.enqueue('orders', {
 *   id: 'msg1',
 *   type: 'order',
 *   payload: { orderId: 123 },
 *   priority: 'high',
 *   timestamp: Date.now()
 * });
 *
 * // Dequeue messages (highest priority first)
 * const message = await queue.dequeue('orders');
 * ```
 */
export class UniversalMessageQueue {
  /**
   * Map storing message queues by topic
   * @private
   */
  private queues = new Map<string, IMessage[]>();

  /**
   * Set of topics currently being processed
   * @private
   */
  private processing = new Set<string>();

  /**
   * Maximum number of messages per queue before overflow to DLQ
   * @private
   */
  private maxQueueSize = 10000;

  /**
   * Dead Letter Queue for messages that couldn't be processed
   * @private
   */
  private dlq = new Map<string, IMessage[]>();

  /**
   * Adds a message to the queue with priority-based insertion.
   * Messages are automatically sorted by priority (critical > high > normal > low).
   *
   * @param topic - The topic to enqueue the message to
   * @param message - The message to enqueue
   *
   * @example
   * ```typescript
   * await queue.enqueue('notifications', {
   *   id: 'notif_123',
   *   type: 'email',
   *   payload: { recipient: 'user@example.com' },
   *   priority: 'critical',
   *   timestamp: Date.now()
   * });
   * ```
   */
  async enqueue(topic: string, message: IMessage): Promise<void> {
    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }
    const queue = this.queues.get(topic)!;
    if (queue.length >= this.maxQueueSize) {
      this.enqueueToDLQ(topic, message);
      return;
    }
    const priority = this.getPriorityValue(message.priority);
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      if (this.getPriorityValue(queue[i]?.priority) < priority) {
        insertIndex = i;
        break;
      }
    }
    queue.splice(insertIndex, 0, message);
  }

  /**
   * Moves a message to the Dead Letter Queue when the main queue is full.
   *
   * @param topic - The topic to add the DLQ message to
   * @param message - The message to add to DLQ
   * @private
   */
  private enqueueToDLQ(topic: string, message: IMessage): void {
    if (!this.dlq.has(topic)) {
      this.dlq.set(topic, []);
    }
    this.dlq.get(topic)!.push(message);
  }

  /**
   * Removes and returns the highest priority message from the queue.
   *
   * @param topic - The topic to dequeue from
   * @returns The next message or null if queue is empty
   *
   * @example
   * ```typescript
   * const message = await queue.dequeue('user-events');
   * if (message) {
   *   console.log('Processing:', message.payload);
   * }
   * ```
   */
  async dequeue(topic: string): Promise<IMessage | null> {
    const queue = this.queues.get(topic);
    return queue?.shift() || null;
  }

  /**
   * Retrieves all messages in the Dead Letter Queue for a topic.
   *
   * @param topic - The topic to get DLQ messages for
   * @returns Array of messages in the DLQ
   *
   * @example
   * ```typescript
   * const failedMessages = queue.getDLQMessages('payments');
   * console.log(`${failedMessages.length} messages failed processing`);
   * ```
   */
  getDLQMessages(topic: string): IMessage[] {
    return this.dlq.get(topic) || [];
  }

  /**
   * Converts priority string to numeric value for sorting.
   * Priority levels: critical (4) > high (3) > normal (2) > low (1)
   *
   * @param priority - The priority string
   * @returns Numeric priority value
   * @private
   */
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'normal':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Returns the current number of messages in a topic's queue.
   *
   * @param topic - The topic to check
   * @returns Number of messages in the queue
   */
  getQueueSize(topic: string): number {
    return this.queues.get(topic)?.length || 0;
  }

  /**
   * Clears messages from queues and DLQ.
   *
   * @param topic - Optional topic to clear. If not provided, clears all queues
   *
   * @example
   * ```typescript
   * // Clear specific topic
   * queue.clear('logs');
   *
   * // Clear all queues
   * queue.clear();
   * ```
   */
  clear(topic?: string): void {
    if (topic) {
      this.queues.delete(topic);
      this.dlq.delete(topic);
    } else {
      this.queues.clear();
      this.dlq.clear();
    }
  }
}
