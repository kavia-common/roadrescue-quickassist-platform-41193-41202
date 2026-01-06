import { createClient } from "@supabase/supabase-js";

const LS_KEYS = {
  session: "rrqa.session",
  users: "rrqa.users",
  requests: "rrqa.requests",
  fees: "rrqa.fees",
  seeded: "rrqa.seeded",
};

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
    { id: uid("u"), email: "user@example.com", password: "password123", role: "user", approved: true },
    { id: uid("m"), email: "mech@example.com", password: "password123", role: "mechanic", approved: false, profile: { name: "Alex Mechanic", serviceArea: "Downtown" } },
    { id: uid("a"), email: "admin@example.com", password: "password123", role: "admin", approved: true },
  ];

  const now = new Date().toISOString();
  const requests = [
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Toyota", model: "Corolla", year: "2016", plate: "ABC-123" },
      issueDescription: "Car won't start, clicking noise.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "Submitted",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    },
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Honda", model: "Civic", year: "2018", plate: "XYZ-987" },
      issueDescription: "Flat tire on rear left.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "In Review",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    },
  ];

  writeJson(LS_KEYS.users, users);
  writeJson(LS_KEYS.requests, requests);
  writeJson(LS_KEYS.fees, { baseFee: 25, perMile: 2.0, afterHoursMultiplier: 1.25 });
  writeJson(LS_KEYS.seeded, true);
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

function getSupabaseEnv() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_KEY;
  return { url, key };
}

// PUBLIC_INTERFACE
function isSupabaseConfigured() {
  /** Returns true only when required REACT_APP_ Supabase env vars are present (React build-time). */
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

function getSupabase() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return null;

  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

async function supaGetUserRole(supabase, userId, email) {
  // Minimal role table assumption: public.profiles(id uuid primary key, email text, role text, approved boolean)
  // If not present, default to "user".
  try {
    const { data, error } = await supabase.from("profiles").select("role,approved").eq("id", userId).maybeSingle();
    if (error) return { role: "user", approved: true };
    if (!data) {
      await supabase.from("profiles").insert({ id: userId, email, role: "user", approved: true });
      return { role: "user", approved: true };
    }
    return { role: data.role || "user", approved: data.approved ?? true };
  } catch {
    return { role: "user", approved: true };
  }
}

// PUBLIC_INTERFACE
export const dataService = {
  /** Data access facade: uses Supabase when configured; otherwise localStorage mock. */

  // PUBLIC_INTERFACE
  async register(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      // When email confirmation is enabled, user might be null; still return.
      const user = data.user;
      if (user) {
        const roleInfo = await supaGetUserRole(supabase, user.id, email);
        return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
      }
      return { id: "pending", email, role: "user", approved: true };
    }

    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered.");
    }
    const user = { id: uid("u"), email, password, role: "user", approved: true };
    setLocalUsers([user, ...users]);
    setLocalSession({ userId: user.id });
    return { id: user.id, email: user.email, role: user.role, approved: user.approved };
  },

  // PUBLIC_INTERFACE
  async login(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      const roleInfo = await supaGetUserRole(supabase, user.id, user.email);
      return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
    }

    const users = getLocalUsers();
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid email or password.");
    setLocalSession({ userId: match.id });
    return { id: match.id, email: match.email, role: match.role, approved: match.approved };
  },

  // PUBLIC_INTERFACE
  async logout() {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    clearLocalSession();
  },

  // PUBLIC_INTERFACE
  async getCurrentUser() {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;
      const roleInfo = await supaGetUserRole(supabase, user.id, user.email);
      return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
    }

    const session = getLocalSession();
    if (!session?.userId) return null;
    const users = getLocalUsers();
    const u = users.find((x) => x.id === session.userId);
    if (!u) return null;
    return { id: u.id, email: u.email, role: u.role, approved: u.approved, profile: u.profile };
  },

  // PUBLIC_INTERFACE
  async listRequests({ forUserId } = {}) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const q = supabase.from("requests").select("*").order("created_at", { ascending: false });
      const res = forUserId ? await q.eq("user_id", forUserId) : await q;
      if (res.error) throw new Error(res.error.message);
      return (res.data || []).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        userId: r.user_id,
        userEmail: r.user_email,
        vehicle: r.vehicle,
        issueDescription: r.issue_description,
        contact: r.contact,
        status: r.status,
        assignedMechanicId: r.assigned_mechanic_id,
        assignedMechanicEmail: r.assigned_mechanic_email,
        notes: r.notes || [],
      }));
    }

    const all = getLocalRequests();
    return (forUserId ? all.filter((r) => r.userId === forUserId) : all).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // PUBLIC_INTERFACE
  async getRequestById(requestId) {
    const list = await this.listRequests();
    return list.find((r) => r.id === requestId) || null;
  },

  // PUBLIC_INTERFACE
  async createRequest({ user, vehicle, issueDescription, contact }) {
    ensureSeedData();
    const supabase = getSupabase();
    const request = {
      id: uid("req"),
      createdAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      vehicle,
      issueDescription,
      contact,
      status: "Submitted",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    };

    if (supabase) {
      const { error } = await supabase.from("requests").insert({
        id: request.id,
        created_at: request.createdAt,
        user_id: request.userId,
        user_email: request.userEmail,
        vehicle: request.vehicle,
        issue_description: request.issueDescription,
        contact: request.contact,
        status: request.status,
        assigned_mechanic_id: null,
        assigned_mechanic_email: null,
        notes: [],
      });
      if (error) throw new Error(error.message);
      return request;
    }

    const all = getLocalRequests();
    setLocalRequests([request, ...all]);
    return request;
  },

  // PUBLIC_INTERFACE
  isSupabaseConfigured,
};
