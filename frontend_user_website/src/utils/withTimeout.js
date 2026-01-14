/**
 * Promise timeout helper to prevent indefinite loading states.
 */

/**
 * PUBLIC_INTERFACE
 */
export function withTimeout(promise, ms, label = "operation") {
  /** Race a promise against a timeout; rejects with a labeled error on timeout. */
  let timerId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timerId) window.clearTimeout(timerId);
  });
}
