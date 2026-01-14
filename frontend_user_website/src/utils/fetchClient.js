/**
 * PUBLIC_INTERFACE
 */
export async function fetchClient(input, init) {
  /**
   * Small wrapper around fetch().
   * Mock mode has been removed; all network calls are allowed.
   */
  return fetch(input, init);
}
