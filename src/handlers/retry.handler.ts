import { IMessageHandler, IMessage } from "@/types"

export class RetryHandler implements IMessageHandler {
  priority = 15
  private retryCount = new Map<string, number>()

  constructor(private maxRetries: number = 3, private retryDelay: number = 1000) {}

  canHandle(message: IMessage): boolean {
    return message.metadata?.retry === true
  }

  async handle(message: IMessage): Promise<void> {
    const currentRetries = this.retryCount.get(message.id) || 0

    if (currentRetries >= this.maxRetries) {
      console.error(`Message ${message.id} exceeded max retries (${this.maxRetries})`)
      this.retryCount.delete(message.id)
      return
    }

    try {
      await this.processMessage(message)
      this.retryCount.delete(message.id)
    } catch (error) {
      console.warn(`Message ${message.id} failed, retrying... (attempt ${currentRetries + 1})`)
      this.retryCount.set(message.id, currentRetries + 1)

      setTimeout(() => {
        console.log(`Retrying message ${message.id}`)
      }, this.retryDelay * Math.pow(2, currentRetries))
    }
  }

  private async processMessage(message: IMessage): Promise<void> {
    throw new Error('Message processing not implemented'+ message)
  }
}
