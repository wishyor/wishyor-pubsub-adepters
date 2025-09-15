import { IBrokerAdapter, IBrokerConfig, IMessage, BrokerMetrics } from '@/types';
import Redis from 'ioredis';
export class RedisAdapter implements IBrokerAdapter {
  private client!: Redis;
  private subscriber!: Redis;
  private subscriptions = new Map<string, string>();

  constructor(
    private config: IBrokerConfig,
    private redisClient: typeof Redis
  ) {}

  async connect(): Promise<void> {
    const options = {
      host: this.config.connection.host || 'localhost',
      port: this.config.connection.port || 6379,
      ...this.config.connection.options,
    };

    this.client = new this.redisClient(options);
    this.subscriber = new this.redisClient(options);
  }

  async disconnect(): Promise<void> {
    await Promise.all([this.client?.quit(), this.subscriber?.quit()]);
  }

  async publish(topic: string, message: IMessage): Promise<void> {
    const channel = message.channel || topic;
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(topic: string, callback: (message: IMessage) => void): Promise<string> {
    const subscriptionId = `redis_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.subscriber.subscribe(topic);
    this.subscriber.on('message', (_channel: string, data: string) => {
      if (topic === _channel) {
        try {
          const message = JSON.parse(data);
          callback(message);
        } catch (error: any) {
          console.log(error.message);
        }
      }
    });

    this.subscriptions.set(subscriptionId, topic);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const topic = this.subscriptions.get(subscriptionId);
    if (!topic) return false;

    await this.subscriber.unsubscribe(topic);
    this.subscriptions.delete(subscriptionId);
    return true;
  }

  isConnected(): boolean {
    return this.client?.status === 'ready' && this.subscriber?.status === 'ready';
  }

  getType(): 'redis' {
    return 'redis';
  }

  async getMetrics(): Promise<BrokerMetrics> {
    const info = await this.client.info();
    return {
      connections: 1,
      messagesPublished: 0,
      messagesReceived: 0,
      errors: 0,
      latency: { avg: 0, min: 0, max: 0 },
      redis_info: info,
    };
  }
}
