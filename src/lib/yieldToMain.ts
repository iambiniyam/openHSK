/**
 * Yield control back to the browser's main thread.
 * Uses scheduler.yield() when available (Chrome 115+), falling back to setTimeout(0).
 * Use this in long-running synchronous loops to keep the UI responsive.
 */
export async function yieldToMain(): Promise<void> {
  const sched = (globalThis as Record<string, unknown>).scheduler;
  if (sched && typeof (sched as { yield?: () => Promise<void> }).yield === 'function') {
    return (sched as { yield(): Promise<void> }).yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
