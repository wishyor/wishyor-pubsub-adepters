/**
 * Performance monitoring utility that tracks latency metrics and broker statistics.
 * Maintains rolling windows of performance data with statistical analysis.
 *
 * @example
 * ```typescript
 * const monitor = new UniversalPerformanceMonitor();
 *
 * // Record operation latencies
 * monitor.recordLatency('publish', 45, 'redis');
 * monitor.recordLatency('subscribe', 12, 'kafka');
 *
 * // Get performance insights
 * const metrics = monitor.getMetrics();
 * console.log('Avg publish latency:', metrics.latency['redis.publish'].avg);
 * ```
 */
export class UniversalPerformanceMonitor {
  /**
   * Map storing latency samples for each operation
   * @private
   */
  private metrics = new Map<string, number[]>();

  /**
   * Map storing broker-specific metrics and metadata
   * @private
   */
  private brokerMetrics = new Map<string, any>();

  /**
   * Maximum number of samples to retain per operation (rolling window)
   * @private
   */
  private readonly maxSamples = 1000;

  /**
   * Records a latency measurement for a specific operation.
   * Maintains a rolling window of samples, discarding oldest when limit is reached.
   *
   * @param operation - The operation being measured (e.g., 'publish', 'subscribe')
   * @param latency - The latency in milliseconds
   * @param broker - Optional broker identifier to scope the metric
   *
   * @example
   * ```typescript
   * // Record message publish latency
   * monitor.recordLatency('publish', 35, 'redis');
   *
   * // Record subscription callback latency
   * monitor.recordLatency('callback', 120);
   * ```
   */
  recordLatency(operation: string, latency: number, broker?: string): void {
    const key = broker ? `${broker}.${operation}` : operation;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const samples = this.metrics.get(key)!;
    samples.push(latency);
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Records broker-specific metrics with timestamp.
   * Stores comprehensive broker performance data for monitoring.
   *
   * @param broker - The broker identifier
   * @param metrics - Broker metrics object (connections, throughput, etc.)
   *
   * @example
   * ```typescript
   * monitor.recordBrokerMetrics('redis', {
   *   connections: 45,
   *   memory_usage: '2.1GB',
   *   ops_per_sec: 15000
   * });
   * ```
   */
  recordBrokerMetrics(broker: string, metrics: any): void {
    this.brokerMetrics.set(broker, {
      ...metrics,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculates the average latency for a specific operation.
   *
   * @param operation - The operation to analyze
   * @param broker - Optional broker to scope the calculation
   * @returns Average latency in milliseconds, or 0 if no samples exist
   *
   * @example
   * ```typescript
   * const avgLatency = monitor.getAverageLatency('publish', 'kafka');
   * console.log(`Average publish latency: ${avgLatency}ms`);
   * ```
   */
  getAverageLatency(operation: string, broker?: string): number {
    const key = broker ? `${broker}.${operation}` : operation;
    const samples = this.metrics.get(key);
    if (!samples || samples.length === 0) return 0;
    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  /**
   * Returns comprehensive performance metrics including latency statistics and broker data.
   * Provides detailed statistical analysis including percentiles for performance insights.
   *
   * @returns Object containing latency stats (avg, min, max, p95, p99) and broker metrics
   *
   * @example
   * ```typescript
   * const metrics = monitor.getMetrics();
   *
   * // Check latency statistics
   * Object.entries(metrics.latency).forEach(([operation, stats]) => {
   *   console.log(`${operation}: avg=${stats.avg}ms, p95=${stats.p95}ms`);
   * });
   *
   * // Review broker health
   * console.log('Broker status:', metrics.brokers);
   * ```
   */
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {
      latency: {},
      brokers: Object.fromEntries(this.brokerMetrics),
    };

    for (const [operation, samples] of this.metrics) {
      if (samples.length > 0) {
        result.latency[operation] = {
          avg: samples.reduce((sum, val) => sum + val, 0) / samples.length,
          min: Math.min(...samples),
          max: Math.max(...samples),
          count: samples.length,
          p95: this.getPercentile(samples, 95),
          p99: this.getPercentile(samples, 99),
        };
      }
    }

    return result;
  }

  /**
   * Calculates the specified percentile value from an array of numbers.
   *
   * @param arr - Array of numeric values
   * @param percentile - Percentile to calculate (0-100)
   * @returns The percentile value
   * @private
   */
  private getPercentile(arr: number[], percentile: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((sorted.length * percentile) / 100) - 1;
    return sorted[index] || 0;
  }
}
