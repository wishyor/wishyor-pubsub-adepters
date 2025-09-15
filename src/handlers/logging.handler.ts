import { IMessageHandler, IMessage } from '@/types';

export class LoggingHandler implements IMessageHandler {
  priority = 1;

  constructor(private logLevel: 'info' | 'debug' | 'error' = 'info') {}

  canHandle(message: IMessage): boolean {
    console.log(message);
    return true;
  }

  handle(message: IMessage): void {
    const timestamp = new Date(message.timestamp).toISOString();
    const logData = {
      timestamp,
      type: message.type,
      id: message.id,
      payload: this.logLevel === 'debug' ? message.payload : '[PAYLOAD]',
      metadata: message.metadata,
    };

    console.log(`[${this.logLevel.toUpperCase()}] Message:`, JSON.stringify(logData, null, 2));
  }
}
