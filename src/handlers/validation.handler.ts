import { IMessageHandler, IMessage } from '@/types';

type Schema<T extends object = any> = {
  required?: (keyof T)[];
};

export class ValidationHandler<TSchemas extends Record<string, object>> implements IMessageHandler {
  priority = 10;

  private schemas: Map<keyof TSchemas, Schema<any>>;

  constructor(schemas: Map<keyof TSchemas, Schema<any>> = new Map()) {
    this.schemas = schemas;
  }

  canHandle(message: IMessage): boolean {
    return this.schemas.has(message.type as keyof TSchemas);
  }

  async handle(message: IMessage): Promise<void> {
    const schema = this.schemas.get(message.type as keyof TSchemas);
    if (!schema) return;

    if (schema.required && schema.required.length > 0) {
      for (const field of schema.required) {
        if (!message.payload || !(field in (message.payload as object))) {
          throw new Error(`Required field '${String(field)}' missing in message ${message.id}`);
        }
      }
    }
  }

  addSchema<K extends keyof TSchemas>(messageType: K, schema: Schema<TSchemas[K]>): void {
    this.schemas.set(messageType, schema);
  }
}
