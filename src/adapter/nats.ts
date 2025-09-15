import { IBrokerAdapter, IBrokerConfig, IMessage, BrokerMetrics } from '@/types';

export class NATSAdapter implements IBrokerAdapter {
  private connection: any;
  private subscriptions = new Map<string, any>();

  constructor(
    private config: IBrokerConfig,
    private nats: any
  ) {}

  async connect(): Promise<void> {
    const options = {
      servers: this.config.connection.urls || [
        this.config.connection.url || 'nats://localhost:4222',
      ],
      ...this.config.connection.options,
    };

    this.connection = await this.nats.connect(options);
  }

  async disconnect(): Promise<void> {
    await this.connection?.close();
  }

  async publish(topic: string, message: IMessage): Promise<void> {
    const subject = message.subject || topic;
    const data = this.nats.StringCodec().encode(JSON.stringify(message));
    this.connection.publish(subject, data);
  }

  async subscribe(
    topic: string,
    callback: (message: IMessage) => void,
    options?: any
  ): Promise<string> {
    const subscriptionId = `nats_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscribeOptions: any = {};

    if (options?.queueGroup) {
      subscribeOptions.queue = options.queueGroup;
    }

    const subscription = this.connection.subscribe(topic, subscribeOptions);

    (async () => {
      for await (const msg of subscription) {
        try {
          const data = this.nats.StringCodec().decode(msg.data);
          const message = JSON.parse(data);
          await callback(message);
        } catch (error) {
          console.error('NATS message processing error:', error);
        }
      }
    })();

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.unsubscribe();
    this.subscriptions.delete(subscriptionId);
    return true;
  }

  isConnected(): boolean {
    return !this.connection?.isClosed();
  }

  getType(): 'nats' {
    return 'nats';
  }

  async getMetrics(): Promise<BrokerMetrics> {
    return {
      connections: 1,
      messagesPublished: 0,
      messagesReceived: 0,
      errors: 0,
      latency: { avg: 0, min: 0, max: 0 },
      connection_status: this.connection?.getServer(),
      subscriptions_count: this.subscriptions.size,
    };
  }
}
