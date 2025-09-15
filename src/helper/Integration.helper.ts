import { MessageBrokerFactory } from '../factory/message.broker';
import { IBrokerConfig, IMessage } from '@/types';
import { UniversalMessageManager } from '../universal/message.manager';

export class IntegrationHelper {
  static async switchBroker(
    currentManager: UniversalMessageManager,
    newConfig: IBrokerConfig,
    dependencies: any
  ): Promise<UniversalMessageManager> {
    await currentManager.disconnect();

    const newManager = await MessageBrokerFactory.create(newConfig, dependencies);
    await newManager.connect();

    return newManager;
  }

  static async migrateSubscriptions(
    fromManager: UniversalMessageManager,
    toManager: UniversalMessageManager,
    subscriptions: { topic: string; callback: (msg: IMessage) => void; options?: any }[]
  ): Promise<string[]> {
    const newSubscriptionIds: string[] = [];

    for (const sub of subscriptions) {
      const id = await toManager.subscribe(sub.topic, sub.callback, sub.options);
      newSubscriptionIds.push(id);
    }

    return newSubscriptionIds;
  }

  static setupCommonMiddleware(manager: UniversalMessageManager): void {
    manager.addMiddleware(async (message, next) => {
      if (message.headers?.['correlation-id']) {
        console.log(`Processing correlated message: ${message.headers['correlation-id']}`);
      }
      await next();
    });

    const rateLimiter = new Map<string, { count: number; resetTime: number }>();
    manager.addMiddleware(async (message, next) => {
      const key = String(message.metadata?.userId || 'anonymous');
      const now = Date.now();
      const window = 60000;
      const limit = 100;

      const userData = rateLimiter.get(key) || { count: 0, resetTime: now + window };

      if (now > userData.resetTime) {
        userData.count = 0;
        userData.resetTime = now + window;
      }

      if (userData.count >= limit) {
        throw new Error(`Rate limit exceeded for ${key}`);
      }

      userData.count++;
      rateLimiter.set(key, userData);

      await next();
    });

    const messageIds = new Set<string>();
    manager.addMiddleware(async (message, next) => {
      if (messageIds.has(message.id)) {
        return;
      }

      messageIds.add(message.id);

      if (messageIds.size > 10000) {
        const oldIds = Array.from(messageIds).slice(0, 1000);
        oldIds.forEach(id => messageIds.delete(id));
      }

      await next();
    });
  }
}
