import { KafkaAdapter } from '../adapter/kafka'
import { NATSAdapter } from '../adapter/nats'
import { RedisAdapter } from '../adapter/redis'
import { IBrokerConfig, IBrokerAdapter } from '@/types'
import { UniversalMessageManager } from '../universal/message.manager'

export class MessageBrokerFactory {
  static async create(config: IBrokerConfig, dependencies?: any): Promise<UniversalMessageManager> {
    let adapter: IBrokerAdapter

    switch (config.type) {
      case 'redis':
        if (!dependencies?.redis) {
          throw new Error('Redis dependency required')
        }
        adapter = new RedisAdapter(config, dependencies.redis)
        break

      case 'nats':
        if (!dependencies?.nats) {
          throw new Error('NATS dependency required')
        }
        adapter = new NATSAdapter(config, dependencies.nats)
        break

      case 'kafka':
        if (!dependencies?.kafkajs) {
          throw new Error('KafkaJS dependency required')
        }
        adapter = new KafkaAdapter(config, dependencies.kafkajs)
        break

      default:
        throw new Error(`Unsupported broker type: ${config.type}`)
    }

    return new UniversalMessageManager(adapter, config)
  }

  static async createRedis(
    host: string,
    port: number,
    redis: any,
    options?: any,
  ): Promise<UniversalMessageManager> {
    const config: IBrokerConfig = {
      type: 'redis',
      connection: { host, port, options },
      features: { persistence: true, clustering: true },
    }
    return await this.create(config, { redis })
  }

  static async createNATS(
    urls: string[],
    nats: any,
    options?: any,
  ): Promise<UniversalMessageManager> {
    const config: IBrokerConfig = {
      type: 'nats',
      connection: { urls, options },
      features: { persistence: false, clustering: true, durability: true },
    }
    return await this.create(config, { nats })
  }

  static async createKafka(
    brokers: string[],
    kafkajs: any,
    options?: any,
  ): Promise<UniversalMessageManager> {
    const config: IBrokerConfig = {
      type: 'kafka',
      connection: { urls: brokers, options },
      features: { persistence: true, clustering: true, partitioning: true, durability: true },
    }
    return await this.create(config, { kafkajs })
  }
}
