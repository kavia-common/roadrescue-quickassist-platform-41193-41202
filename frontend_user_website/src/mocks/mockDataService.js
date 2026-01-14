import { normalizeStatus } from "../services/statusUtils";

const LS_KEYS = {
  session: "rrqa.session",
  users: "rrqa.users",
  requests: "rrqa.requests",
  seeded: "rrqa.seeded",
};

function delay(ms = 180) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeedData() {
  const seeded = readJson(LS_KEYS.seeded, false);
  if (seeded) return;

  const users = [
    {
      id: uid("u"),
      email: "user@example.com",
      password: "password123",
      role: "user",
      approved: true,
      profile: { name: "Sam Driver", phone: "555-0101" },
    },
    {
      id: uid("m"),
      email: "mech@example.com",
      password: "password123",
      role: "mechanic",
      approved: false,
      profile: { name: "Alex Mechanic", serviceArea: "Downtown" },
    },
    { id: uid("a"), email: "admin@example.com", password: "password123", role: "admin", approved: true, profile: { name: "Admin" } },
  ];

  const now = new Date().toISOString();
  const requests = [
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Toyota", model: "Corolla" },
      issueDescription: "Car won't start, clicking noise.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "OPEN",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    },
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Honda", model: "Civic" },
      issueDescription: "Flat tire on rear left.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "ASSIGNED",
      assignedMechanicId: users[1].id,
      assignedMechanicEmail: users[1].email,
      notes: [],
    },
  ];

  writeJson(LS_KEYS.users, users);
  writeJson(LS_KEYS.requests, requests);
  writeJson(LS_KEYS.seeded, true);

  // Auto-login the seeded user to ensure the UI is immediately navigable offline.
  writeJson(LS_KEYS.session, { userId: users[0].id });
}

function getLocalSession() {
  return readJson(LS_KEYS.session, null);
}

function setLocalSession(session) {
  writeJson(LS_KEYS.session, session);
}

function clearLocalSession() {
  window.localStorage.removeItem(LS_KEYS.session);
}

function getLocalUsers() {
  return readJson(LS_KEYS.users, []);
}

function setLocalUsers(users) {
  writeJson(LS_KEYS.users, users);
}

function getLocalRequests() {
  return readJson(LS_KEYS.requests, []);
}

function setLocalRequests(reqs) {
  writeJson(LS_KEYS.requests, reqs);
}

// PUBLIC_INTERFACE
export const mockDataService = {
  /** Offline-only mock implementation for auth/profile/requests (no network calls). */

  // PUBLIC_INTERFACE
  async register(email, password) {
    ensureSeedData();
    await delay();

    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered.");
    }
    const user = { id: uid("u"), email, password, role: "user", approved: true, profile: { name: "", phone: "" } };
    setLocalUsers([user, ...users]);
    setLocalSession({ userId: user.id });
    return { id: user.id, email: user.email, role: user.role, approved: user.approved };
  },

  // PUBLIC_INTERFACE
  async login(email, password) {
    ensureSeedData();
    await delay();

    const users = getLocalUsers();
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid email or password.");
    setLocalSession({ userId: match.id });
    return { id: match.id, email: match.email, role: match.role, approved: match.approved };
  },

  // PUBLIC_INTERFACE
  async loginWithGoogle() {
    /** Offline mode: Google OAuth is not supported. */
    await delay(60);
    throw new Error("Google sign-in is disabled in MOCK MODE.");
  },

  // PUBLIC_INTERFACE
  async logout() {
    await delay(60);
    clearLocalSession();
  },

  // PUBLIC_INTERFACE
  async getCurrentUser() {
    ensureSeedData();
    await delay(80);

    const session = getLocalSession();
    if (!session?.userId) return null;
    const u = getLocalUsers().find((x) => x.id === session.userId);
    if (!u) return null;
    return { id: u.id, email: u.email, role: u.role, approved: u.approved, profile: u.profile };
  },

  // PUBLIC_INTERFACE
  subscribeToAuthChanges() {
    /** Mock mode: no real-time auth provider; return a no-op unsubscribe. */
    return () => {};
  },

  // PUBLIC_INTERFACE
  async getProfile(userId) {
    ensureSeedData();
    await delay(120);

    const u = getLocalUsers().find((x) => x.id === userId);
    if (!u) throw new Error("Profile not found.");
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      approved: u.approved,
      profile: u.profile || {},
    };
  },

  // PUBLIC_INTERFACE
  async listRequests({ forUserId } = {}) {
    ensureSeedData();
    await delay(160);

    const all = getLocalRequests().map((r) => ({
      ...r,
      status: normalizeStatus(r.status),
      vehicle: {
        make: typeof r.vehicle?.make === "string" ? r.vehicle.make : "",
        model: typeof r.vehicle?.model === "string" ? r.vehicle.model : "",
      },
      contact: r.contact && typeof r.contact === "object" ? r.contact : { name: "", phone: "" },
    }));

    const filtered = forUserId ? all.filter((r) => r.userId === forUserId) : all;
    return filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  // PUBLIC_INTERFACE
  async getRequestById(requestId) {
    await delay(80);
    const list = await this.listRequests();
    return list.find((r) => r.id === requestId) || null;
  },

  // PUBLIC_INTERFACE
  async createRequest({ user, vehicle, issueDescription, contact }) {
    ensureSeedData();
    await delay(220);

    const nowIso = new Date().toISOString();
    const safeVehicle = {
      make: vehicle && typeof vehicle.make === "string" ? vehicle.make : "",
      model: vehicle && typeof vehicle.model === "string" ? vehicle.model : "",
    };
    const safeContact = {
      name: contact?.name || "",
      phone: contact?.phone || "",
    };

    const request = {
      id: uid("req"),
      createdAt: nowIso,
      userId: user.id,
      userEmail: user.email,
      vehicle: safeVehicle,
      issueDescription,
      contact: safeContact,
      status: "OPEN",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    };

    const all = getLocalRequests();
    setLocalRequests([request, ...all]);
    return request;
  },

  // PUBLIC_INTERFACE
  isSupabaseConfigured() {
    /** In MOCK MODE we explicitly treat Supabase as disabled. */
    return false;
  },
};
