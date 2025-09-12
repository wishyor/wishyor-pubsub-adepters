import { IMessageHandler, IMessage } from '@/types'

export class TransformHandler implements IMessageHandler {
  priority = 5

  constructor(private transformers: Map<string, (payload: any) => any> = new Map()) {}

  canHandle(message: IMessage): boolean {
    return this.transformers.has(message.type)
  }

  handle(message: IMessage): void {
    const transformer = this.transformers.get(message.type)
    if (transformer) {
      message.payload = transformer(message.payload)
    }
  }

  addTransformer(messageType: string, transformer: (payload: any) => any): void {
    this.transformers.set(messageType, transformer)
  }
}
