import { IBrokerAdapter, IBrokerConfig, IMessage, BrokerMetrics } from '@/types'

export class KafkaAdapter implements IBrokerAdapter {
  private kafka: any
  private producer: any
  private consumers = new Map<string, any>()
  private subscriptions = new Map<string, { consumer: any; topic: string }>()

  constructor(private config: IBrokerConfig, private kafkaJS: any) {}

  async connect(): Promise<void> {
    this.kafka = this.kafkaJS.kafka({
      clientId: 'universal-message-broker',
      brokers: this.config.connection.urls || [this.config.connection.url || 'localhost:9092'],
      ...this.config.connection.options,
    })

    this.producer = this.kafka.producer()
    await this.producer.connect()
  }

  async disconnect(): Promise<void> {
    await this.producer?.disconnect()

    for (const consumer of this.consumers.values()) {
      await consumer.disconnect()
    }
  }

  async publish(topic: string, message: IMessage): Promise<void> {
    const kafkaMessage = {
      key: message.id,
      value: JSON.stringify(message),
      partition: message.partition ? parseInt(message.partition) : undefined,
      headers: message.headers,
    }

    await this.producer.send({
      topic,
      messages: [kafkaMessage],
    })
  }

  async subscribe(
    topic: string,
    callback: (message: IMessage) => void,
    options?: any,
  ): Promise<string> {
    const subscriptionId = `kafka_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const groupId = options?.consumerGroup || `group_${subscriptionId}`

    const consumer = this.kafka.consumer({ groupId })
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: false })

    await consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const parsedMessage = JSON.parse(message.value.toString())
          parsedMessage.partition = partition.toString()
          await callback(parsedMessage)
        } catch (error) {
          console.error('Kafka message processing error:', error)
        }
      },
    })

    this.consumers.set(subscriptionId, consumer)
    this.subscriptions.set(subscriptionId, { consumer, topic })

    return subscriptionId
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    await subscription.consumer.disconnect()
    this.consumers.delete(subscriptionId)
    this.subscriptions.delete(subscriptionId)

    return true
  }

  isConnected(): boolean {
    return this.producer?._isConnected || false
  }

  getType(): 'kafka' {
    return 'kafka'
  }

  async getMetrics(): Promise<BrokerMetrics> {
    return {
      connections: 1,
      messagesPublished: 0,
      messagesReceived: 0,
      errors: 0,
      latency: { avg: 0, min: 0, max: 0 },
      consumers_count: this.consumers.size,
      subscriptions_count: this.subscriptions.size,
    }
  }
}
