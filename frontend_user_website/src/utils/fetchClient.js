import { appConfig } from "../config/appConfig";

/**
 * PUBLIC_INTERFACE
 */
export async function fetchClient(input, init) {
  /**
   * A small wrapper around fetch() that blocks network calls in MOCK MODE.
   * Use this anywhere a component/service needs to call fetch.
   */
  if (appConfig.isMockMode) {
    const url = typeof input === "string" ? input : input?.url;
    throw new Error(`Network call blocked in MOCK MODE: fetch(${url || "unknown"})`);
  }
  return fetch(input, init);
}
