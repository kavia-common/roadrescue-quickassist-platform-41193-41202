import { useCallback, useEffect, useMemo, useState } from "react";

const REQUESTS_KEY = "rrq_user_requests";

function safeReadRequests() {
  try {
    const raw = window.localStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function safeWriteRequests(list) {
  try {
    window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function makeId() {
  // Human-friendly unique-ish id for MVP
  return `RRQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function normalizeStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "accepted") return "Accepted";
  if (s === "completed") return "Completed";
  return "Pending";
}

// PUBLIC_INTERFACE
export function useUserRequests() {
  /** Manages local mock requests persisted in localStorage. */
  const [requests, setRequests] = useState(() => safeReadRequests());

  useEffect(() => {
    safeWriteRequests(requests);
  }, [requests]);

  const addRequest = useCallback((payload) => {
    const now = new Date().toISOString();
    const next = {
      id: makeId(),
      createdAt: now,
      status: "Pending",
      vehicle: {
        make: String(payload?.vehicle?.make || "").trim(),
        model: String(payload?.vehicle?.model || "").trim(),
      },
      problemDescription: String(payload?.problemDescription || "").trim(),
      location: String(payload?.location || "").trim(),
      contactPhone: String(payload?.contactPhone || "").trim(),
    };

    setRequests((prev) => [next, ...prev]);
    return next;
  }, []);

  const setStatus = useCallback((id, status) => {
    const normalized = normalizeStatus(status);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: normalized } : r)));
  }, []);

  const clearAll = useCallback(() => setRequests([]), []);

  const api = useMemo(() => ({ requests, addRequest, setStatus, clearAll }), [requests, addRequest, setStatus, clearAll]);
  return api;
}
