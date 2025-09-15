import { IMessage } from '@/types';

export class MessageBuilder {
  private message: Partial<IMessage> = {};

  static create(): MessageBuilder {
    return new MessageBuilder();
  }

  id(id: string): MessageBuilder {
    this.message.id = id;
    return this;
  }

  type(type: string): MessageBuilder {
    this.message.type = type;
    return this;
  }

  payload(payload: any): MessageBuilder {
    this.message.payload = payload;
    return this;
  }

  priority(priority: 'low' | 'normal' | 'high' | 'critical'): MessageBuilder {
    this.message.priority = priority;
    return this;
  }

  metadata(key: string, value: unknown): MessageBuilder {
    if (!this.message.metadata) {
      this.message.metadata = {} as Record<string, unknown>;
    }
    (this.message.metadata as Record<string, unknown>)[key] = value;
    return this;
  }

  header(key: string, value: string): MessageBuilder {
    if (!this.message.headers) {
      this.message.headers = {} as Record<string, string>;
    }
    (this.message.headers as Record<string, string>)[key] = value;
    return this;
  }

  partition(partition: string): MessageBuilder {
    this.message.partition = partition;
    return this;
  }

  subject(subject: string): MessageBuilder {
    this.message.subject = subject;
    return this;
  }

  channel(channel: string): MessageBuilder {
    this.message.channel = channel;
    return this;
  }

  build(): IMessage {
    if (!this.message.id) {
      this.message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!this.message.timestamp) {
      this.message.timestamp = Date.now();
    }
    return this.message as IMessage;
  }
}
