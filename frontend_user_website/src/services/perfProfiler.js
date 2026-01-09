/**
 * Lightweight profiling helpers for user-flow performance investigations.
 *
 * Goals:
 * - Provide consistent, low-noise timings for key steps (geocode, UI updates, DB writes).
 * - Be safe in production (opt-in; does nothing when disabled).
 *
 * Enablement:
 * - When REACT_APP_LOG_LEVEL is "debug" OR
 * - When REACT_APP_FEATURE_FLAGS contains "perf" OR "performance" (comma/space separated)
 */

function normalizeFlagList(v) {
  return String(v || "")
    .split(/[,\s]+/g)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function isEnabled() {
  const logLevel = String(process.env.REACT_APP_LOG_LEVEL || "").toLowerCase();
  if (logLevel === "debug") return true;

  const flags = normalizeFlagList(process.env.REACT_APP_FEATURE_FLAGS);
  return flags.includes("perf") || flags.includes("performance") || flags.includes("profiling");
}

function nowMs() {
  // Prefer high-resolution timing when available.
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function safeConsole(method, ...args) {
  try {
    // eslint-disable-next-line no-console
    console[method](...args);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function createProfiler(flowName) {
  /**
   * Create a profiler instance for a single user flow (e.g., one submit click).
   *
   * Usage:
   *   const p = createProfiler("submit_request");
   *   p.mark("start");
   *   ... await ...
   *   p.measure("db_write", "before_db", "after_db");
   *   p.end(); // logs a grouped summary
   */
  const enabled = isEnabled();
  const sessionId = `${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  /** @type {Map<string, number>} */
  const marks = new Map();
  /** @type {Array<{name: string, ms: number}>} */
  const measures = [];
  const createdAt = nowMs();

  function formatMs(ms) {
    if (!Number.isFinite(ms)) return "n/a";
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 100) return `${ms.toFixed(1)}ms`;
    return `${Math.round(ms)}ms`;
  }

  function ensureMark(name) {
    if (!marks.has(name)) marks.set(name, nowMs());
  }

  const api = {
    // PUBLIC_INTERFACE
    mark(name) {
      /** Record a timestamp for later measurement. No-op when disabled. */
      if (!enabled) return;
      marks.set(String(name), nowMs());
    },

    // PUBLIC_INTERFACE
    measure(name, startMark, endMark) {
      /**
       * Record a duration between two marks. No-op when disabled.
       * If marks are missing, it will auto-create them to avoid throwing.
       */
      if (!enabled) return;
      const sKey = String(startMark);
      const eKey = String(endMark);
      ensureMark(sKey);
      ensureMark(eKey);

      const ms = (marks.get(eKey) || 0) - (marks.get(sKey) || 0);
      measures.push({ name: String(name), ms });
    },

    // PUBLIC_INTERFACE
    timeAsync(label, fn) {
      /**
       * Convenience wrapper to time an async function.
       * @template T
       * @param {string} label
       * @param {() => Promise<T>} fn
       * @returns {Promise<T>}
       */
      if (!enabled) return fn();
      const start = nowMs();
      return Promise.resolve()
        .then(fn)
        .finally(() => {
          const ms = nowMs() - start;
          measures.push({ name: String(label), ms });
        });
    },

    // PUBLIC_INTERFACE
    info(message, data) {
      /** Log an info line tied to this flow. */
      if (!enabled) return;
      safeConsole("log", `[perf] ${flowName} (${sessionId}) ${message}`, data ?? "");
    },

    // PUBLIC_INTERFACE
    end(extra) {
      /**
       * Emit a summary group for the flow and return raw measures.
       * @param {Object} [extra]
       * @returns {{sessionId: string, flowName: string, totalMs: number, measures: Array<{name: string, ms: number}>}}
       */
      const totalMs = nowMs() - createdAt;
      if (!enabled) {
        return { sessionId, flowName, totalMs, measures: [] };
      }

      // Sort measures by duration desc for quick bottleneck identification.
      const sorted = [...measures].sort((a, b) => b.ms - a.ms);

      safeConsole("groupCollapsed", `[perf] ${flowName} (${sessionId}) total=${formatMs(totalMs)}`);
      for (const m of sorted) {
        safeConsole("log", `• ${m.name}: ${formatMs(m.ms)}`);
      }
      if (extra) safeConsole("log", "extra:", extra);
      safeConsole("groupEnd");

      return { sessionId, flowName, totalMs, measures: sorted };
    },
  };

  return api;
}
