/**
 * Simple performance test for CI
 */

const { MessageBrokerFactory } = require('../dist/index.js');

async function runPerformanceTest() {
  console.log('🚀 Starting performance test...');
  
  try {
    // Mock Redis for testing
    const mockRedis = class {
      constructor() {
        this.connected = false;
      }
      
      async connect() {
        this.connected = true;
        console.log('✅ Mock Redis connected');
      }
      
      async disconnect() {
        this.connected = false;
        console.log('✅ Mock Redis disconnected');
      }
      
      async quit() {
        this.connected = false;
        console.log('✅ Mock Redis quit');
      }
      
      async info() {
        return 'redis_version:7.0.0\r\nused_memory:1000000\r\nconnected_clients:1';
      }
      
      async publish(channel, message) {
        return 1;
      }
      
      async subscribe(channel) {
        return 'OK';
      }
      
      on() {}
      off() {}
      
      get status() {
        return this.connected ? 'ready' : 'disconnected';
      }
    };

    const manager = await MessageBrokerFactory.createRedis('localhost', 6379, mockRedis);
    await manager.connect();

    // Simple publish test
    const startTime = Date.now();
    const messageCount = 100;
    
    console.log(`📤 Publishing ${messageCount} messages...`);
    
    for (let i = 0; i < messageCount; i++) {
      await manager.publishImmediate('test.topic', {
        id: i,
        timestamp: Date.now(),
        data: `Test message ${i}`
      });
    }
    
    const duration = Date.now() - startTime;
    const throughput = messageCount / (duration / 1000);
    
    console.log(`✅ Performance test completed!`);
    console.log(`📊 Results:`);
    console.log(`   Messages: ${messageCount}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Throughput: ${throughput.toFixed(2)} msg/sec`);
    
    await manager.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

runPerformanceTest().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});