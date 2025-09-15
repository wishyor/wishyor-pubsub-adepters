import { ISubscription, IMessage } from '@/types';

/**
 * Manages message subscriptions with filtering capabilities.
 * Handles subscription lifecycle and message filtering for topic-based messaging.
 *
 * @example
 * ```typescript
 * const manager = new UniversalSubscriptionManager();
 *
 * // Create and register subscription
 * const subscription = {
 *   id: 'sub_123',
 *   topic: 'user.events',
 *   callback: async (msg) => console.log(msg),
 *   filters: { status: 'active' }
 * };
 *
 * manager.subscribe(subscription);
 * ```
 */
export class UniversalSubscriptionManager {
  /**
   * Map of topics to their subscription collections
   * @private
   */
  private subscriptions = new Map<string, Map<string, ISubscription>>();

  /**
   * Map of topics to their subscriber ID sets for quick lookups
   * @private
   */
  private topicSubscribers = new Map<string, Set<string>>();

  /**
   * Registers a new subscription for a topic.
   * Creates topic entries if they don't exist and tracks subscriber relationships.
   *
   * @param subscription - The subscription object to register
   * @returns The subscription ID
   *
   * @example
   * ```typescript
   * const subId = manager.subscribe({
   *   id: 'order_processor',
   *   topic: 'orders',
   *   callback: processOrder,
   *   filters: { status: 'pending', priority: 'high' }
   * });
   * ```
   */
  subscribe(subscription: ISubscription): string {
    const { topic, id } = subscription;

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
      this.topicSubscribers.set(topic, new Set());
    }

    this.subscriptions.get(topic)!.set(id, subscription);
    this.topicSubscribers.get(topic)!.add(id);

    return id;
  }

  /**
   * Removes a subscription from a topic.
   * Cleans up empty topic entries when no subscriptions remain.
   *
   * @param topic - The topic to unsubscribe from
   * @param subscriptionId - The subscription ID to remove
   * @returns True if subscription was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const removed = manager.unsubscribe('notifications', 'email_handler');
   * if (removed) {
   *   console.log('Successfully unsubscribed');
   * }
   * ```
   */
  unsubscribe(topic: string, subscriptionId: string): boolean {
    const topicSubs = this.subscriptions.get(topic);
    if (!topicSubs) return false;

    const removed = topicSubs.delete(subscriptionId);
    this.topicSubscribers.get(topic)?.delete(subscriptionId);

    if (topicSubs.size === 0) {
      this.subscriptions.delete(topic);
      this.topicSubscribers.delete(topic);
    }

    return removed;
  }

  /**
   * Retrieves all subscriptions for a specific topic.
   *
   * @param topic - The topic to get subscriptions for
   * @returns Array of subscriptions for the topic
   *
   * @example
   * ```typescript
   * const subs = manager.getSubscriptions('payments');
   * console.log(`${subs.length} handlers registered for payments`);
   * ```
   */
  getSubscriptions(topic: string): ISubscription[] {
    const subs = this.subscriptions.get(topic);
    return subs ? Array.from(subs.values()) : [];
  }

  /**
   * Returns all topics that have active subscriptions.
   *
   * @returns Array of topic names with active subscriptions
   *
   * @example
   * ```typescript
   * const topics = manager.getAllTopics();
   * topics.forEach(topic => {
   *   console.log(`Active topic: ${topic}`);
   * });
   * ```
   */
  getAllTopics(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Checks if a message matches the provided filters.
   * Supports exact matching and wildcard patterns using '*'.
   *
   * @param message - The message to test against filters
   * @param filters - Optional filter criteria to match against
   * @returns True if message matches all filters (or no filters provided)
   *
   * @example
   * ```typescript
   * const message = {
   *   type: 'user.login',
   *   payload: { userId: 123, region: 'us-east' },
   *   metadata: { source: 'mobile-app' }
   * };
   *
   * // Exact match
   * const matches1 = manager.matchesFilters(message, { region: 'us-east' });
   *
   * // Wildcard match
   * const matches2 = manager.matchesFilters(message, { source: 'mobile-*' });
   * ```
   */
  matchesFilters(message: IMessage, filters?: Record<string, any>): boolean {
    if (!filters) return true;

    return Object.entries(filters).every(([key, value]) => {
      const msgValue =
        (message.payload as Record<string, unknown>)?.[key] ||
        (message.metadata as Record<string, unknown>)?.[key];

      if (typeof value === 'string' && value.includes('*')) {
        const regex = new RegExp(value.replace(/\*/g, '.*'));
        return regex.test(String(msgValue));
      }

      return msgValue === value;
    });
  }
}
