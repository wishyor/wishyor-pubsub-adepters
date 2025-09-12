export class HealthChecker {
  private checks = new Map<string, () => Promise<boolean>>()

  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check)
  }

  async runHealthChecks(): Promise<
    Record<string, { status: 'healthy' | 'unhealthy'; timestamp: number; error?: string }>
  > {
    const results: Record<string, any> = {}

    for (const [name, check] of this.checks) {
      try {
        const isHealthy = await check()
        results[name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: Date.now(),
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    return results
  }
}
