import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Automation-originated work runs at depth 1.
 * Business hooks refuse to enqueue another automation while depth is above 0,
 * so a rule cannot trigger itself through the action it just performed.
 */
const storage = new AsyncLocalStorage<{ depth: number }>();

export const MAX_AUTOMATION_DEPTH = 1;

export function automationDepth(): number {
  return storage.getStore()?.depth ?? 0;
}

export function runInsideAutomation<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ depth: automationDepth() + 1 }, fn);
}
