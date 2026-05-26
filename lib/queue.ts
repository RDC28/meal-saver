import { logger } from './logger'

type Task = () => Promise<unknown>

// Run task with exponential-backoff retries.
// Use for important but non-critical async work (e.g. notifications).
export async function withRetry(
  task: Task,
  context: string,
  maxAttempts = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await task()
      return
    } catch (e) {
      if (attempt === maxAttempts) {
        logger.error(context, `Task failed after ${maxAttempts} attempts`, e)
        return
      }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 500))
    }
  }
}

// Fire and forget — preferred over raw `.catch(() => null)` because it logs failures.
export function fireAndForget(task: Task, context: string): void {
  task().catch(e => logger.error(context, 'Background task failed', e))
}
